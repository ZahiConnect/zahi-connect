import os
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain.tools import StructuredTool
from langchain_community.utilities import SQLDatabase
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_groq import ChatGroq
from pydantic import BaseModel, Field
from langchain.memory import ConversationBufferMemory

from config import settings

class FoodSearchInput(BaseModel):
    query: str = Field(description="The name of the food or category the user wants to search for.")
    location: str = Field(default="", description="The city or area the user is in. Leave empty if unknown.")

class WhatsAppRestaurantAgent:
    def __init__(self):
        self.groq_key = settings.GROQ_API_KEY
        self.db = None
        
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            groq_api_key=self.groq_key,
            temperature=0.0
        )
        self.agent_executor = self._create_agent()

    def _init_database(self):
        if self.db is None:
            try:
                # Same DB connection as the rest of the app
                db_uri = f"postgresql+psycopg2://postgres:postgres@db:5432/zahi_connect_db"
                self.db = SQLDatabase.from_uri(
                    db_uri,
                    include_tables=["menu_items"],
                )
                print("[DATABASE] ✓ Successfully connected to PostgreSQL")
                return True
            except Exception as e:
                print(f"[DB ERROR]: {e}")
                return False
        return True

    def _search_food_tool_logic(self, query: str, location: str = "") -> str:
        """Searches the database for food items"""
        print(f"[ACTION] Searching DB for: '{query}' in '{location}'")
        if not self._init_database():
            return "Database unavailable."

        location_filter = ""
        if location:
            location_filter = f" AND t.address ILIKE '%{location}%'"

        sql = f"SELECT m.id, m.name, m.description, m.dine_in_price, m.is_available, t.slug, t.name as restaurant_name FROM menu_items m JOIN tenants t ON m.tenant_id = t.id WHERE m.name ILIKE '%{query}%' AND m.is_available = true{location_filter} LIMIT 5;"
        
        try:
            result = self.db.run(sql)
            if not result or result == "[]" or result == "[(None,)]":
                return f"No food found matching '{query}'."
            
            # Format the output nicely so the LLM can give the link
            return f"Found items: {result}. When you reply to the user, give them the link format: http://127.0.0.1:5174/restaurants/<slug>?focus=<id>&add=1"
        except Exception as e:
            print(f"[SQL ERROR]: {e}")
            return "Error searching for food."

    def _create_agent(self):
        tools = [
            StructuredTool.from_function(
                func=self._search_food_tool_logic,
                name="search_food",
                description="Look up food items in the restaurant menu. Always use this when the user asks for food.",
                args_schema=FoodSearchInput,
            )
        ]

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are Zahi Connect's WhatsApp Assistant.
            Your job is to help users find food from our restaurant menu.
            - Always use the search_food tool when they ask for food.
            - If they ask for "nearest" food, politely ask them which city or area they are in right now.
            - Once you know their location, pass it into the search_food tool.
            - When you find food, ALWAYS give them the direct link to buy it.
            - Mention the name of the restaurant in your reply.
            - The link format is: http://127.0.0.1:5174/restaurants/<slug>?focus=<id>&add=1
            - Keep your answers short, friendly, and use emojis.
            - If they ask general questions, just say you only handle restaurant orders right now.
            """),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])

        agent = create_tool_calling_agent(self.llm, tools, prompt)
        
        return AgentExecutor(
            agent=agent, 
            tools=tools, 
            verbose=True
        )

    async def process_query(self, user_query: str, phone_number: str, memory: ConversationBufferMemory) -> str:
        try:
            print(f"\n[AGENT START] Message from {phone_number}: {user_query}")
            
            # Pass memory variables to the agent
            response = await self.agent_executor.ainvoke({
                "input": user_query,
                "chat_history": memory.chat_memory.messages
            })
            
            # Save the new interaction to memory
            memory.save_context({"input": user_query}, {"output": response["output"]})
            
            return response["output"]

        except Exception as e:
            print(f"[CRITICAL AGENT ERROR]: {str(e)}")
            return "I'm having trouble connecting to my systems right now."
