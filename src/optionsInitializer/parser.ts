import {
  TextNodeWithFlags as ParserTextNode,
  WhitespaceNode as ParserWhitespaceNode,
  scanArgs,
  ScannerNodeKind,
} from "./scanner";

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

const enum NodeFlags {
  None = 0,
  HasMoreThanTwoDashes = 1 << 1,
  HasMoreThanOneEquals = 1 << 2,
}

type NodeId = number & { unique: symbol };

type ExcludeParent<T extends Node> = Omit<T, "parent">;

interface ParentLessNode {
  readonly kind: NodeKind;
  readonly id: NodeId;
  flags: NodeFlags;
}

interface Node extends ParentLessNode {
  parent: ParentLessNode;
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

interface ArgumentNode extends Node {
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
  findNodeById(id: NodeId): Node | undefined;
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

  // TODO: consider using a WeakMap, since garbage collection should be applied to nodes not bound to the syntax tree.
  const idNodeMap = new Map<NodeId, Node>();
  const syntaxTree: SyntaxTree = {
    ...createParentLessNode(NodeKind.SyntaxTree),
    arguments: [],
  };

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

  loopThroughScannedNodes((node, { peekNextNode }) => {
    // TODO: pick up here
    // - If we encounter whitespace or an equals sign, we check if we're creating a long flag argument and the flag is already set.
    //   If we are, we should create and bind a separator node.
    //   Otherwise, ignore the separator and log a warning.
    // - If we encounter dashes, check if we are already creating an argument.
    //   If we are, ignore the dashes and log a warning.
    //   If we aren't, create and bind a dash node.
    // - If we encounter an unflagged text node, create a UnknownTextNode.
    //   Narrow it to a FlagNode or a ValueNode (offloaded to another function), then bind it to whichever needs it.
    // - Check if everything that's needed for a argument node has been created.
    //   If it has, then create the argument node, bind it to the syntax tree, and clean up for the next node.
    //   Otherwise, just keep going.
    // - If there's no more left scanned nodes left, and we can't naturally make an argument node, then check if we can forcefully create one.
    //   We need a dash node and a flag node to forcefully create a argument node.
    //   If we can, do so, bind it to the syntax tree, and exit.
  });

  return createApi(syntaxTree);

  interface ScannedNodeLoopHelpers {
    peekNextNode(): ParserTextNode | ParserWhitespaceNode | undefined;
  }

  function loopThroughScannedNodes(
    cb: (
      node: ParserWhitespaceNode | ParserTextNode,
      helpers: ScannedNodeLoopHelpers
    ) => void
  ): void {
    const scannedArgs = [...scanArgs(argsString)];

    for (const [index, node] of scannedArgs.entries()) {
      cb(node, {
        peekNextNode(): ParserTextNode | ParserWhitespaceNode | undefined {
          return scannedArgs[index + 1];
        },
      });
    }
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

  function createArgumentNode(
    dash: ExcludeParent<DashNode>,
    flag: ExcludeParent<FlagNode>,
    separator?: ExcludeParent<SeparatorNode>,
    value?: ExcludeParent<ValueNode>
  ): ArgumentNode {
    const argumentNode: ArgumentNode = {
      ...createParentLessNode(NodeKind.Argument),
      parent: syntaxTree,
      dash: dash as DashNode,
      flag: flag as FlagNode,
    };

    (dash as DashNode).parent = argumentNode;
    (flag as FlagNode).parent = argumentNode;

    if (value && separator) {
      argumentNode.separator = { ...separator, parent: argumentNode };
      argumentNode.value = { ...value, parent: argumentNode };
    }

    return argumentNode;
  }

  function createParentLessDashNode(): ExcludeParent<DashNode> {
    return {
      ...createParentLessNode(NodeKind.Dash),
      flags: moreThanTwoDashesFlag
        ? NodeFlags.HasMoreThanTwoDashes
        : NodeFlags.None,
      singleDash: singleDashFlag,
      doubleDash: doubleDashFlag,
    };
  }

  function createParentLessSeparatorNode(): ExcludeParent<SeparatorNode> {
    return createParentLessNode(NodeKind.Separator);
  }

  function createParentLessUnknownTextNode(
    node: ParserTextNode
  ): ExcludeParent<UnknownTextNode> {
    return createTextNode(NodeKind.UnknownText, node);
  }

  function createParentLessValueNode(
    node: ParserTextNode
  ): ExcludeParent<ValueNode> {
    return createTextNode(NodeKind.Value, node);
  }

  function createParentLessFlagNode(
    node: ParserTextNode
  ): ExcludeParent<FlagNode> {
    return createTextNode(NodeKind.Flag, node);
  }

  function createTextNode<T extends NodeKind>(kind: T, node: ParserTextNode) {
    return { ...createParentLessNode(kind), text: node.text };
  }

  function createParentLessNode<T extends NodeKind>(kind: T) {
    return {
      kind,
      flags: NodeFlags.None,
      id: createNodeId(),
    };
  }

  function createApi(syntaxTree: SyntaxTree): SyntaxTreeApi {
    return {
      syntaxTree,
      findNodeById(id: NodeId): Node | undefined {
        return idNodeMap.get(id);
      },
    };
  }

  function createNodeId(): NodeId {
    let i = 0 as NodeId;

    while (idNodeMap.has(i)) {
      i++;
    }

    return i;
  }
}
