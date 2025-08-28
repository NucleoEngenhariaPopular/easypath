from datetime import datetime



class Message ():
    def __init__(self, role:str = "", content:str = "") -> None:
        self.role:str = role
        self.content:str = content
        self.datetime:datetime = datetime.now()
        
class ChatHistory ():
    def __init__(self) -> None:
        self.history:list[Message] = []
        
    def addUserMessage(self, message:str) -> None:
        self.history.append(Message(role="user",content = message))
        
    def addAssistantMessage(self, message:str) -> None:
        self.history.append(Message(role="assistant",content = message))
     
    def getLastMessage(self) -> str:
        return self.history[-1].content
    
    def getLLMformatted(self, model:str = "deepseek") -> list[dict]:
        history_list = []
        
        if model == "deepseek":
            for message in self.history:
                history_list.append({"content":message.content,"role":message.role})
            return history_list
        
        return history_list