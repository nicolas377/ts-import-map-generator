import {
  TextNodeWithFlags as ParserTextNode,
  WhitespaceNode as ParserWhitespaceNode,
  scanArgs,
  ScannerNodeKind,
} from "./scanner";
import { Debug } from "utils";

const enum NodeKind {
  SyntaxTree,
  Whitespace,
  Argument,
  Flag,
  Value,
  EqualsSign,
  Dash,
  UnknownText,
}

const enum NodeFlags {
  None = 0,
  HasMoreThanTwoDashes = 1 << 0,
  HasMoreThanOneEquals = 1 << 1,
}

type NodeId = number;

type ExcludeParentFromNode<T extends Node> = Omit<T, "parent">;

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
  readonly kind: NodeKind.EqualsSign;
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

interface WhitespaceNode extends Node {
  readonly kind: NodeKind.Whitespace;
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
  readonly arguments: readonly ArgumentNode[];
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

  let currentDashNode: ExcludeParentFromNode<DashNode> | undefined;
  let currentFlagNode: ExcludeParentFromNode<FlagNode> | undefined;
  let currentSeparatorNode: ExcludeParentFromNode<SeparatorNode> | undefined;
  let currentValueNode: ExcludeParentFromNode<ValueNode> | undefined;

  loopThroughScannedNodes((node, { peekNextNode }) => {
    if (node.kind === ScannerNodeKind.Whitespace) {
      if (doubleDashFlag) {
        // We're in the middle of parsing a long flag argument.
      }
      // We don't care about whitespace when not parsing a long flag argument.
      else return;
    } else {
      if (node.dashFlag) {
        if (node.text.length === 1) {
          singleDashFlag = true;
        } else {
          if (node.text.length >= 2) {
            doubleDashFlag = true;
          }
          if (node.text.length > 2) {
            moreThanTwoDashesFlag = true;
          }
        }

        currentDashNode = createParentLessDashNode(node);
      }
    }
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

  function createParentLessDashNode(
    node: ParserTextNode
  ): ExcludeParentFromNode<DashNode> {
    return {
      ...createParentLessNode(NodeKind.Dash),
      flags: moreThanTwoDashesFlag
        ? NodeFlags.HasMoreThanTwoDashes
        : NodeFlags.None,
      singleDash: singleDashFlag,
      doubleDash: doubleDashFlag,
    };
  }

  function createParentLessArgumentNode(
    dash: ExcludeParentFromNode<DashNode>,
    flag: ExcludeParentFromNode<FlagNode>,
    separator?: ExcludeParentFromNode<SeparatorNode>,
    value?: ExcludeParentFromNode<ValueNode>
  ): ArgumentNode {
    const argumentNode: ArgumentNode = {
      ...createParentLessNode(NodeKind.Argument),
      parent: syntaxTree,
      dash: dash as DashNode,
      flag: flag as FlagNode,
    };

    (dash as DashNode).parent = argumentNode;
    (flag as FlagNode).parent = argumentNode;

    if (value) {
      if (separator) {
        argumentNode.separator = { ...separator, parent: argumentNode };
      }
      argumentNode.value = { ...value, parent: argumentNode };
    }

    return argumentNode;
  }

  function createParentLessNode<T extends NodeKind>(
    kind: T
  ): ParentLessNode & { kind: T } {
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
    let i = 0;

    while (idNodeMap.has(i)) {
      i++;
    }

    return i;
  }
}
