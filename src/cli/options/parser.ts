import {
  scanArgs,
  ScannerNodeKind,
  TextNodeWithFlags as ScannerTextNode,
  WhitespaceNode as ScannerWhitespaceNode,
} from "./scanner";
import { Debug } from "utils";

const enum NodeKind {
  SyntaxTree,
  Separator,
  Argument,
  Flag,
  Value,
  EqualsSign,
  Dash,
  UnknownText,
}

export const enum NodeFlags {
  None = 0,
  HasMoreThanTwoDashes = 1 << 0, // This dash node was created from a scanned node of more than two dashes.
  NarrowedFromUnflaggedText = 1 << 1, // This value or flag node was narrowed from an UnknownTextNode by narrowUnknownTextNode().
  IsTopLevelSyntaxTree = 1 << 2, // This node is the full syntax tree.
  ForceCreated = 1 << 3, // This argument node was forcefully created, because we ran into the end of text while in the middle of creating a argument.
}

type NodeId = number & { unique: symbol };

type ExcludeParent<T extends Node> = Omit<T, "parent">;

interface ParentLessNode {
  readonly kind: NodeKind;
  readonly id: NodeId;
  flags: NodeFlags;
}

interface Node extends ParentLessNode {
  readonly parent: ParentLessNode;
}

interface UnknownTextNode extends Node {
  readonly kind: NodeKind.UnknownText;
  readonly text: string;
}

interface SeparatorNode extends Node {
  readonly kind: NodeKind.Separator;
}

interface ValueNode extends Node {
  readonly kind: NodeKind.Value;
  readonly text: string;
}

interface FlagNode extends Node {
  readonly kind: NodeKind.Flag;
  readonly text: string;
}

interface DashNode extends Node {
  readonly kind: NodeKind.Dash;

  readonly singleDash: boolean;
  readonly doubleDash: boolean;
}

export interface ArgumentNode extends Node {
  readonly kind: NodeKind.Argument;

  readonly dash: DashNode;
  readonly flag: FlagNode;
  separator?: SeparatorNode;
  value?: ValueNode;
}

interface SyntaxTree extends ParentLessNode {
  readonly kind: NodeKind.SyntaxTree;
  readonly arguments: ArgumentNode[];
}

interface SyntaxTreeApi {
  readonly syntaxTree: SyntaxTree;
  findNodeById(id: NodeId): ParentLessNode | undefined;
  forEachNode(cb: (node: Node) => void): void;
}

export function parseSyntaxTreeFromArgsString(
  argsString: string
): SyntaxTreeApi {
  // The parser is made to construct a syntax tree.
  // The syntax tree starts with a root node, and then has a series of argument nodes.
  // Each argument node has a dash node, a flag node, an equals sign node, and a value node.
  // The parser is built around parsing those nodes from the phrases yielded by the scanner, and creating the syntax tree from them.
  // There are a few special cases:
  // - If the current dash node has one dash, and the scanner yields an unflagged text node, the the text node should be treated with each individual character as a flag.
  //   This is because short flags can be combined, e.g. -abc is equivalent to -a -b -c.
  // - If the current dash node has one dash, a equals sign node and a value node should be ignored.
  //   This is because short flags cannot have values attached to them.

  const idNodeMap = new Map<NodeId, ParentLessNode>();
  const syntaxTree: SyntaxTree = Object.assign(
    createParentLessNode(NodeKind.SyntaxTree),
    { arguments: [] }
  );
  applyFlagsToNode(syntaxTree, NodeFlags.IsTopLevelSyntaxTree);
  const scannedArgs = [...scanArgs(argsString)];

  let currentScannedArgIndex = -1;
  let currentScannedArg = scannedArgs[currentScannedArgIndex];
  let isOutOfScannedArgs = false as boolean;

  const flagDefaults = {
    singleDash: false,
    doubleDash: false,
    moreThanTwoDashes: false,
  };

  let singleDashFlag: boolean = flagDefaults.singleDash;
  let doubleDashFlag: boolean = flagDefaults.doubleDash;
  let moreThanTwoDashesFlag: boolean = flagDefaults.moreThanTwoDashes;

  let currentDashNode: ExcludeParent<DashNode> | undefined;
  let currentFlagNode: ExcludeParent<FlagNode> | undefined;
  let currentSeparatorNode: ExcludeParent<SeparatorNode> | undefined;
  let currentValueNode: ExcludeParent<ValueNode> | undefined;

  while (currentScannedArgIndex < scannedArgs.length) {
    if (currentScannedArg === undefined) {
      // This is the first iteration. We should just set up the first scanned arg and continue.
      setupNextScannedArg();
      continue;
    }

    // If we encounter whitespace or an equals sign, check if we're creating a long flag argument and the flag is already set.
    if (scannerNodeIsSeparator(currentScannedArg)) {
      // We won't do anything else with a separator node, so we can just discard it if we don't do anything now.
      if (currentFlagNode && isCurrentlyCreatingArgument() && doubleDashFlag) {
        // If we are, we should create and bind a separator node.
        currentSeparatorNode = createParentLessSeparatorNode();
      } else if (!currentFlagNode) {
        Debug.log.warn("Unexpected whitespace or equals sign in argument.");
      }
    }

    // If we encounter dashes, check if we are already creating an argument.
    else if (currentScannedArg.dashFlag) {
      if (!isCurrentlyCreatingArgument()) {
        // If we aren't, create and bind a dash node.
        singleDashFlag = currentScannedArg.text.length === 1;
        doubleDashFlag = currentScannedArg.text.length >= 2;
        moreThanTwoDashesFlag = currentScannedArg.text.length > 2;

        currentDashNode = createParentLessDashNode();
      } else {
        Debug.log.warn("Unexpected dashes in argument.");
      }
    }

    // If the current dash node has one dash, then the text node should be treated with each individual character as a flag.
    else if (singleDashFlag) {
      for (const char of currentScannedArg.text) {
        currentDashNode = createParentLessDashNode();
        currentFlagNode = createParentLessFlagNode(char);
        createAndBindArgumentNode();
      }

      resetForNewArgument();
      setupNextScannedArg();
      continue;
    }

    // If we encounter an unflagged text node, create a UnknownTextNode.
    else {
      const unknownTextNode = createParentLessUnknownTextNode(
        currentScannedArg.text
      );

      // Narrow it to a FlagNode or a ValueNode (offloaded to another function), then bind it.
      const narrowedTextNodeOrFalse = narrowUnknownTextNode(unknownTextNode);

      if (narrowedTextNodeOrFalse === false) {
        // Do nothing. We don't want to bind the node.
        Debug.log.warn("Unknown text node.");
      } else if (narrowedTextNodeOrFalse.kind === NodeKind.Flag) {
        // If we can narrow the unknown text node to a flag node, we should create and bind a flag node.
        currentFlagNode = narrowedTextNodeOrFalse;
      } else {
        // If we can narrow the unknown text node to a value node, we should create and bind a value node.
        currentValueNode = narrowedTextNodeOrFalse;
      }
    }

    // Check if everything that's needed for a argument node has been created.
    // If it has, then create the argument node, bind it to the syntax tree, and clean up for the next node.
    // If there's no more left scanned nodes left, and we can't naturally make an argument node, then check if we can forcefully create one.
    // We need a dash node and a flag node to forcefully create a argument node.
    if (
      canNaturallyCreateArgumentNode() ||
      (isOutOfScannedArgs && currentDashNode && currentFlagNode)
    ) {
      createAndBindArgumentNode();
      resetForNewArgument();
    }

    if (isOutOfScannedArgs) {
      break;
    }

    // Otherwise, just keep going.
    setupNextScannedArg();
  }

  return finalizeSyntaxTreeAndCreateApi(syntaxTree, idNodeMap);

  // Attempts to narrow the unknown text node to a flag node or a value node depending on the context.
  function narrowUnknownTextNode(
    unknownTextNode: ExcludeParent<UnknownTextNode>
  ): ExcludeParent<FlagNode> | ExcludeParent<ValueNode> | false {
    // If we're not currently creating an argument, then we can't narrow the unknown text node, so we log a warning and return false.
    if (!isCurrentlyCreatingArgument()) {
      Debug.log.warn("Unexpected text node between arguments.");
      return false;
    }

    const oneNodeForward = peekForwardNArgs(1);
    const twoNodesForward = peekForwardNArgs(2);

    // Narrowing based on context.

    // If the next token is a equals sign, then we should narrow the unknown text node to a flag node.
    if (scannerNodeIsText(oneNodeForward) && oneNodeForward.equalsFlag) {
      return createFlagNode();
    }
    // If two tokens forward is a dash node, or the previous node is a separator node, then we should narrow the unknown text node to a value node.
    const oneNodeBack = peekForwardNArgs(-1);
    if (
      (scannerNodeIsText(twoNodesForward) &&
        twoNodesForward.dashFlag &&
        // We can't narrow to a value node if the previous node is the start of a new argument (dashes).
        !(scannerNodeIsText(oneNodeBack) && oneNodeBack.dashFlag)) ||
      scannerNodeIsSeparator(oneNodeBack)
    ) {
      return createValueNode();
    }
    // If we need to fill a hole at currentFlagNode, then we should create a flag node.
    if (currentFlagNode === undefined) {
      return createFlagNode();
    }
    // If we need to fill a hole at currentValueNode, then we should create a value node.
    if (currentValueNode === undefined) {
      return createValueNode();
    }

    return false;

    function createFlagNode(): ExcludeParent<FlagNode> {
      const node = createParentLessFlagNode(unknownTextNode.text);
      applyFlagsToNode(node, NodeFlags.NarrowedFromUnflaggedText);

      return node;
    }

    function createValueNode(): ExcludeParent<ValueNode> {
      const node = createParentLessValueNode(unknownTextNode.text);
      applyFlagsToNode(node, NodeFlags.NarrowedFromUnflaggedText);

      return node;
    }
  }

  function canNaturallyCreateArgumentNode(): boolean {
    let canCreateArgument = false;

    // We need a dash node and a flag node no matter what.
    if (currentDashNode && currentFlagNode) {
      // If the dash node has two dashes, we can have a separator and value node, so check ahead to see if those are present.
      if (doubleDashFlag) {
        const forward2Args = peekForwardNArgs(2);

        // If two arguments forward is the start of a new argument or is the end of the string, this argument ends now.
        // Note that we don't support "--flag= --nextFlag", so we don't need to check for that.
        if (scannerNodeIsText(forward2Args) && forward2Args.dashFlag) {
          canCreateArgument = true;
        }
      }

      // If the dash node has one dash, we can't have a separator or value node, so we can create an argument node.
      else if (singleDashFlag) {
        canCreateArgument = true;
      }
    }

    return canCreateArgument;
  }

  function isCurrentlyCreatingArgument(): boolean {
    return currentDashNode !== undefined;
  }

  function createAndBindArgumentNode(): NodeId {
    const argumentNode = createArgumentNode(
      currentDashNode!,
      currentFlagNode!,
      currentSeparatorNode,
      currentValueNode
    );
    syntaxTree.arguments.push(argumentNode);

    return argumentNode.id;
  }

  function createArgumentNode(
    dash: ExcludeParent<DashNode>,
    flag: ExcludeParent<FlagNode>,
    separator?: ExcludeParent<SeparatorNode>,
    value?: ExcludeParent<ValueNode>
  ): ArgumentNode {
    const argumentNode: ArgumentNode = Object.assign(
      createParentLessNode(NodeKind.Argument),
      {
        parent: syntaxTree,
        dash: dash as DashNode,
        flag: flag as FlagNode,
      }
    );

    Object.assign(dash, { parent: argumentNode });
    Object.assign(flag, { parent: argumentNode });

    if (value && separator) {
      argumentNode.separator = Object.assign(separator, {
        parent: argumentNode,
      });
      argumentNode.value = Object.assign(value, { parent: argumentNode });
    }

    return argumentNode;
  }

  function createParentLessDashNode(): ExcludeParent<DashNode> {
    return Object.assign(createParentLessNode(NodeKind.Dash), {
      flags: moreThanTwoDashesFlag
        ? NodeFlags.HasMoreThanTwoDashes
        : NodeFlags.None,
      singleDash: singleDashFlag,
      doubleDash: doubleDashFlag,
    });
  }

  function createParentLessSeparatorNode(): ExcludeParent<SeparatorNode> {
    return createParentLessNode(NodeKind.Separator);
  }

  function createParentLessUnknownTextNode(
    text: string
  ): ExcludeParent<UnknownTextNode> {
    return createTextNode(NodeKind.UnknownText, text);
  }

  function createParentLessValueNode(text: string): ExcludeParent<ValueNode> {
    return createTextNode(NodeKind.Value, text);
  }

  function createParentLessFlagNode(text: string): ExcludeParent<FlagNode> {
    return createTextNode(NodeKind.Flag, text);
  }

  function createTextNode<T extends NodeKind>(kind: T, text: string) {
    return Object.assign(createParentLessNode(kind), { text });
  }

  function createParentLessNode<T extends NodeKind>(kind: T) {
    const node = {
      kind,
      flags: NodeFlags.None,
      id: createNodeId(),
    };

    idNodeMap.set(node.id, node);

    return node;
  }

  function createNodeId(): NodeId {
    let i = 0 as NodeId;

    while (idNodeMap.has(i)) {
      i++;
    }

    return i;
  }

  // helper functions here

  function setupNextScannedArg(): void {
    const nextScannedArgIndex = currentScannedArgIndex + 1;

    // If the next scanned arg index is out of bounds, then we are out of scanned args after this one.
    if (nextScannedArgIndex >= scannedArgs.length - 1) {
      isOutOfScannedArgs = true;
    }

    currentScannedArgIndex = nextScannedArgIndex;
    currentScannedArg = scannedArgs[currentScannedArgIndex];
  }

  function resetForNewArgument(): void {
    currentDashNode = undefined;
    currentFlagNode = undefined;
    currentSeparatorNode = undefined;
    currentValueNode = undefined;

    singleDashFlag = flagDefaults.singleDash;
    doubleDashFlag = flagDefaults.doubleDash;
    moreThanTwoDashesFlag = flagDefaults.moreThanTwoDashes;
  }

  // narrowing functions here

  function nodeIsArgument(node: Node): node is ArgumentNode {
    return node.kind === NodeKind.Argument;
  }

  function scannerNodeIsText(
    node: ScannerTextNode | ScannerWhitespaceNode | undefined
  ): node is ScannerTextNode {
    return node?.kind === ScannerNodeKind.Text;
  }

  function scannerNodeIsSeparator(
    node: ScannerTextNode | ScannerWhitespaceNode | undefined
  ): node is ScannerWhitespaceNode | (ScannerTextNode & { equalsFlag: true }) {
    return (
      (node?.kind === ScannerNodeKind.Whitespace || node?.equalsFlag) ?? false
    );
  }

  function peekForwardNArgs(
    n: number
  ): ScannerTextNode | ScannerWhitespaceNode | undefined {
    return scannedArgs[currentScannedArgIndex + n];
  }

  function applyFlagsToNode(node: ParentLessNode, flags: NodeFlags): void {
    node.flags |= flags;
  }

  function finalizeSyntaxTreeAndCreateApi(
    syntaxTree: SyntaxTree,
    idNodeMap: Map<NodeId, ParentLessNode>
  ): SyntaxTreeApi {
    pruneIdNodeMap();

    return {
      syntaxTree,
      findNodeById(id: NodeId): ParentLessNode | undefined {
        return idNodeMap.get(id);
      },
      forEachNode: forEachNodeInSyntaxTree,
    };

    function pruneIdNodeMap(): void {
      const idsInSyntaxTree: NodeId[] = [];

      forEachNodeInSyntaxTree((node) => {
        idsInSyntaxTree.push(node.id);
      });

      for (const id of idNodeMap.keys()) {
        if (!idsInSyntaxTree.includes(id)) {
          idNodeMap.delete(id);
        }
      }
    }

    function forEachNodeInSyntaxTree(callback: (node: Node) => void): void {
      // We start at the top of the syntax tree and traverse down to the bottom, calling the callback on each node.
      traverseDown(syntaxTree);

      function traverseDown(node: Node | SyntaxTree): void {
        if (node.kind === NodeKind.SyntaxTree) {
          (node as SyntaxTree).arguments.forEach(traverseDown);
          return;
        }

        callback(node);

        if (nodeIsArgument(node)) {
          traverseDown(node.dash);
          traverseDown(node.flag);
          if (node.separator) {
            traverseDown(node.separator);
          }
          if (node.value) {
            traverseDown(node.value);
          }
        }
      }
    }
  }
}
