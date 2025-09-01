import json



class Prompt:
    def __init__(self, context: str = "", objective: str = "", notes: str = "", examples: str = "") -> None:
        self.context: str = context
        self.objective: str = objective
        self.notes: str = notes
        self.examples: str = examples


class VariableExtraction:
    def __init__(self, 
                 name: str = "", 
                 var_type: str = "", 
                 prompt: str = "") -> None:
        
        self.name: str = name
        self.var_type: str = var_type
        self.prompt: str = prompt


class Node:
    def __init__(self,
                 id: str = "",
                 node_type: str = "",
                 prompt: Prompt = Prompt(),
                 is_start: bool = False,
                 is_end: bool = False,
                 use_llm: bool = True,
                 is_global: bool = False,
                 extract_vars: list[VariableExtraction] = [VariableExtraction()],
                 temperature: float = 0.2,
                 skip_user_response: bool = False,
                 overrides_global_pathway: bool = True,
                 loop_condition: str = "") -> None:

        self.id: str = id
        self.node_type: str = type
        self.prompt: Prompt = prompt
        self.is_start: bool = is_start
        self.is_end: bool = is_end
        self.use_llm: bool = use_llm
        self.is_global: bool = is_global
        # TODO implement global node condition (how to evaluate with connections?)
        self.extract_vars: list[VariableExtraction] = extract_vars
        self.temperature: float = temperature
        self.skip_user_response: bool = skip_user_response
        self.overrides_global_pathway: bool = overrides_global_pathway
        self.loop_condition: str = loop_condition


class Connection:
    def __init__(self, id: str = "",
                 label: str = "",
                 description: str = "",
                 else_option: bool = False,
                 source: str = "",
                 target: str = "") -> None:
        self.id: str = id
        self.label: str = label
        self.description: str = description
        self.else_option: bool = else_option
        self.source: str = source
        self.target: str = target



class Flow:
    def __init__(self):
        """Initialize a new Flow instance."""
        self.first_node_id: str
        self.nodes: list[Node]
        self.connections: list[Connection]
        self.global_objective: str = ""
        self.global_tone: str = ""
        self.global_language: str = ""
        self.global_behaviour: str = ""
        self.global_values: str = ""

    def getNodeByID(self, id:str = "")->Node:
        return next(node for node in self.nodes if node.id == id)
    
    def loadFromFile(self, filePath: str = "flow.json") -> None:
        """Load flow data from a JSON file and populate the Flow object.

        Args:
            filePath (str): Path to the JSON file. Defaults to "flow.json".

        Returns:
            Dict[str, Any]: Parsed JSON data.

        Raises:
            FileNotFoundError: If the file does not exist.
            json.JSONDecodeError: If the file is not valid JSON.
        """
        try:
            with open(filePath, "r") as flowFile:
                flow_data = json.load(flowFile)

                self.global_objective = flow_data["global_objective"]
                self.global_tone = flow_data["global_tone"]
                self.global_language = flow_data["global_language"]
                self.global_behaviour = flow_data["global_behaviour"]
                self.global_values = flow_data["global_values"]
                self.nodes = []
                for node in flow_data["nodes"]:
                    node_prompt = Node(node["context_prompt"],
                                       node["objective_prompt"],
                                       node["notes_prompt"],
                                       node["examples_prompt"])
                    
                    variables_extraction_prompts = []
                    for variable_extraction_prompt in node["extract_vars"]:
                        variables_extraction_prompts.append(VariableExtraction(variable_extraction_prompt["name"],
                                                                               variable_extraction_prompt["var_type"],
                                                                               variable_extraction_prompt["prompt"]))

                    self.nodes.append(Node(id = node["id"], 
                                           node_type = node["type"],
                                           prompt = node_prompt,
                                           is_start = node["is_start"],
                                           is_end = node["is_end"],
                                           use_llm = node["use_llm"],
                                           is_global = node["is_global"],
                                           extract_vars = variable_extraction_prompt,
                                           temperature = node["model"]["temperature"],
                                           overrides_global_pathway = node["model"]["overrides_global_pathway"],
                                           loop_condition = node["loop_condition"]))
                self.connections = []
                for connection in flow_data["connections"]: 
                    self.connections.append(Connection(id = connection["id"],
                                                       label = connection["data"["label"]],
                                                       description = connection["data"]["description"],
                                                       else_option = connection["else"],
                                                       source = connection["source"],
                                                       target = connection["target"]))
                    
        except FileNotFoundError:
            raise FileNotFoundError(f"The file {filePath} does not exist.")
        except json.JSONDecodeError:
            raise json.JSONDecodeError(
                f"The file {filePath} is not valid JSON.", doc="", pos=0)
        except Exception as error:
            raise Exception(f"Error loading the JSON file: {error}")
