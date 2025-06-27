import esprima
import escodegen


class Converter:
    reserved_properties = ["position", "scale", "anchorPoint", "rotation"]
    op_to_func = {
        "+": "$bm_sum",
        "-": "$bm_sub",
        "*": "$bm_mul",
        "/": "$bm_div",
        "%": "$bm_mod",
    }

    def __init__(self):
        self.stack = [set()]
        self.scope = set()
        self.undeclared = set()

    def value_to_node(self, val):
        if isinstance(val, list):
            return list(map(self.value_to_node, val))
        elif isinstance(val, dict):
            node = esprima.nodes.Node()
            for k, v in val.items():
                setattr(node, k, self.value_to_node(v))
            return node
        return val

    def make_member(self, name):
        return self.value_to_node({
            "type": "MemberExpression",
            "object": {
                "name": "$bm_transform",
                "type": "Identifier"
            },
            "property": {
                "name": name,
                "type": "Identifier"
            }
        })

    def assign_variable(self, right, expr=True):
        data = {
            "left": {
                "name": "$bm_rt",
                "type": "Identifier"
            },
            "type": "AssignmentExpression",
            "operator": "=",
            "right": right,
        }
        if expr:
            data = {
                "type": "ExpressionStatement",
                "expression": data
            }
        return self.value_to_node(data)

    def declare(self, name):
        if name not in self.scope:
            self.scope.add(name)
            self.stack[-1].add(name)

    def push(self, vars):
        self.stack.append(set(vars))

    def pop(self):
        popped = self.stack.pop()
        for item in popped:
            self.scope.remove(item)

    def process(self, node):
        node = self.process_node(node, False)
        if self.undeclared:
            node.body.insert(0, self.value_to_node({
                "type": "VariableDeclaration",
                "declarations": [
                    {
                        "type": "VariableDeclarator",
                        "id": {
                            "type": "Identifier",
                            "name": name
                        }
                    }
                    for name in self.undeclared
                ],
                "kind": "var"
            }))

        return node

    def process_node(self, node, in_member):
        scopes = self.on_node_enter(node)

        member = node.type == "MemberExpression"

        if scopes is not None:
            for name, value in node.items():
                is_scope = name in scopes
                if is_scope:
                    self.push(scopes[name])

                if isinstance(value, esprima.nodes.Node):
                    setattr(node, name, self.process_node(value, member))
                elif isinstance(value, list):
                    setattr(node, name, [self.process_node(v, member) for v in value])

                if is_scope:
                    self.pop()

        node = self.on_node_leave(node, in_member)
        return node

    def gather_params(self, params, names):
        for n in params:
            if n.type == "Identifier":
                names.append(n.name)
            elif n.type == "AssignmentPattern":
                self.gather_params([n.left], names)
            elif n.type == "RestElement":
                self.gather_params([n.argument], names)

    def on_node_enter(self, node):
        if node.type == "VariableDeclarator":
            self.declare(node.id.name)
        elif node.type == "BlockStatement":
            return {"body": []}
        elif node.type == "ArrowFunctionExpression" or node.type == "FunctionDeclaration":
            params = self.gather_params(node.params, [])
            return {"params": params, "body": params}
        elif node.type == "MemberExpression":
            if node.property.type == "Identifier":
                if node.property.name == "name":
                    node.property.name = "_name"
            elif node.property.type == "Literal":
                if node.property.value == "name":
                    node.property.value = "_name"
                    node.property.raw = "'_name'"

        return {}

    def on_node_leave(self, node, member):
        if node.type == "Identifier" and not member:
            if node.name in self.reserved_properties and node.name not in self.scope:
                return self.make_member(node.name)
        elif node.type == "ExpressionStatement":
            if node.expression.type == 'SequenceExpression':
                ass = self.assign_variable(node.expression.expressions[-1], False)
                node.expression.expressions[-1] = ass
            else:
                return self.assign_variable(node.expression)
        elif node.type == "BinaryExpression":
            rep = self.op_to_func.get(node.operator)
            if rep:
                return self.value_to_node({
                    "type": "CallExpression",
                    "arguments": [node.left, node.right],
                    "callee": {
                        "name": rep,
                        "type": "Identifier"
                    }
                })
        elif node.type == "AssignmentExpression":
            if node.left and node.left.name and node.left.name != "value" and node.left.name not in self.scope:
                self.undeclared.add(node.left.name)

        return node


def process_expression(string):
    """!
    @brief converts expressions the same was as the bodymovin plugin
    """
    parsed = esprima.parseScript(string)
    Converter().process(parsed)
    return "var $bm_rt;\n" + escodegen.generate(parsed)
