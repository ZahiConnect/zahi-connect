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
    location: str = Field(default="", description="The text city or area the user is in.")
    lat: float | None = Field(default=None, description="The user's GPS latitude if they shared it.")
    lon: float | None = Field(default=None, description="The user's GPS longitude if they shared it.")

class HotelSearchInput(BaseModel):
    query: str = Field(description="The name of the hotel or type of room the user wants.")
    location: str = Field(default="", description="The text city or area the user is in.")
    lat: float | None = Field(default=None, description="The user's GPS latitude if they shared it.")
    lon: float | None = Field(default=None, description="The user's GPS longitude if they shared it.")

class CabSearchInput(BaseModel):
    location: str = Field(default="", description="The text city or area the user wants a cab from.")
    lat: float | None = Field(default=None, description="The user's GPS latitude if they shared it.")
    lon: float | None = Field(default=None, description="The user's GPS longitude if they shared it.")

class FlightSearchInput(BaseModel):
    destination: str = Field(description="The destination city or airport code (e.g. Dubai, DXB).")
    origin: str = Field(default="", description="The origin city or airport code (e.g. Kochi, COK).")



class WhatsAppRestaurantAgent:
    def __init__(self):
        self.groq_key = settings.GROQ_API_KEY
        self.db = None
        
        primary_llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            groq_api_key=self.groq_key,
            temperature=0.0
        )
        
        fallback_1 = ChatGroq(
            model="mixtral-8x7b-32768",
            groq_api_key=self.groq_key,
            temperature=0.0
        )
        
        fallback_2 = ChatGroq(
            model="llama-3.1-8b-instant",
            groq_api_key=self.groq_key,
            temperature=0.0
        )
        
        self.llm = primary_llm.with_fallbacks([fallback_1, fallback_2])
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

    def _search_food_tool_logic(self, query: str, location: str = "", lat: float | None = None, lon: float | None = None) -> str:
        """Searches the database for food items"""
        print(f"[ACTION] Searching DB for: '{query}' in '{location}', GPS: {lat},{lon}")
        if not self._init_database():
            return "Database unavailable."

        distance_sql = ""
        order_clause = ""
        from_clause = "FROM menu_items m JOIN tenants t ON m.tenant_id = t.id LEFT JOIN restaurant_profiles rp ON t.id = rp.tenant_id"
        where_clause = f"WHERE m.name ILIKE '%{query}%' AND m.is_available = true"
        
        if lat is not None and lon is not None:
            distance_sql = f", 'distance_km', ROUND((6371 * acos(cos(radians({lat})) * cos(radians(rp.latitude)) * cos(radians(rp.longitude) - radians({lon})) + sin(radians({lat})) * sin(radians(rp.latitude))))::numeric, 2)"
            order_clause = f"ORDER BY (6371 * acos(cos(radians({lat})) * cos(radians(rp.latitude)) * cos(radians(rp.longitude) - radians({lon})) + sin(radians({lat})) * sin(radians(rp.latitude)))) ASC"
        elif location:
            where_clause += f" AND (t.address ILIKE '%{location}%' OR rp.city ILIKE '%{location}%' OR rp.area_name ILIKE '%{location}%')"

        select_clause = f"SELECT json_build_object('id', m.id, 'name', m.name, 'description', m.description, 'price', m.dine_in_price, 'is_available', m.is_available, 'slug', t.slug, 'restaurant_name', t.name{distance_sql})"
        
        sql = f"{select_clause} {from_clause} {where_clause} {order_clause} LIMIT 5;"
        
        try:
            result = self.db.run(sql)
            if not result or result == "[]" or result == "[(None,)]":
                return f"No food found matching '{query}'."
            
            # Format the output nicely so the LLM can give the link
            return f"Found items: {result}. When you reply to the user, give them the link format: http://127.0.0.1:5174/restaurants/<slug>?focus=<id>&add=1"
        except Exception as e:
            print(f"[SQL ERROR]: {e}")
            return "Error searching for food."

    def _search_hotels_tool_logic(self, query: str, location: str = "", lat: float | None = None, lon: float | None = None) -> str:
        """Searches the database for hotels"""
        print(f"[ACTION] Searching DB for Hotels: '{query}' in '{location}', GPS: {lat},{lon}")
        if not self._init_database():
            return "Database unavailable."

        distance_sql = ""
        order_clause = ""
        from_clause = "FROM tenants t LEFT JOIN hotel_documents hd ON hd.tenant_id = t.id AND hd.collection = 'settings'"
        where_clause = "WHERE t.business_type = 'hotel' AND t.is_active = true"
        
        # Keyword filter
        if query and query.lower() not in ["hotel", "room", "stay", "resort"]:
            where_clause += f" AND (t.name ILIKE '%{query}%' OR (hd.payload->>'addr') ILIKE '%{query}%')"

        # Location filter
        if lat is not None and lon is not None:
            distance_sql = f", 'distance_km', ROUND((6371 * acos(cos(radians({lat})) * cos(radians((hd.payload->>'latitude')::float)) * cos(radians((hd.payload->>'longitude')::float) - radians({lon})) + sin(radians({lat})) * sin(radians((hd.payload->>'latitude')::float))))::numeric, 2)"
            order_clause = f"ORDER BY (6371 * acos(cos(radians({lat})) * cos(radians((hd.payload->>'latitude')::float)) * cos(radians((hd.payload->>'longitude')::float) - radians({lon})) + sin(radians({lat})) * sin(radians((hd.payload->>'latitude')::float)))) ASC"
        elif location:
            where_clause += f" AND ((hd.payload->>'addr') ILIKE '%{location}%' OR t.address ILIKE '%{location}%' OR t.name ILIKE '%{location}%')"

        select_clause = f"SELECT json_build_object('hotel_name', t.name, 'slug', t.slug, 'address', (hd.payload->>'addr'), 'available_rooms', (SELECT count(*) FROM hotel_documents WHERE tenant_id = t.id AND collection = 'rooms' AND payload->>'status' = 'Available'){distance_sql})"
        
        sql = f"{select_clause} {from_clause} {where_clause} {order_clause} LIMIT 5;"
        
        try:
            result = self.db.run(sql)
            if not result or result == "[]" or result == "[(None,)]":
                return f"No hotels found matching '{query}' in that location."
            
            return f"Found hotels: {result}. When you reply to the user, give them the link format: http://127.0.0.1:5174/hotels/<slug>"
        except Exception as e:
            print(f"[SQL ERROR]: {e}")
            return "Error searching for hotels."

    def _search_cabs_tool_logic(self, location: str = "", lat: float | None = None, lon: float | None = None) -> str:
        """Searches the database for available cabs"""
        print(f"[ACTION] Searching DB for Cabs near '{location}', GPS: {lat},{lon}")
        if not self._init_database():
            return "Database unavailable."

        distance_sql = ""
        order_clause = ""
        from_clause = "FROM mobility_vehicles v JOIN mobility_drivers d ON v.driver_id = d.id"
        where_clause = "WHERE d.is_online = true AND d.status = 'active'"
        
        if lat is not None and lon is not None:
            distance_sql = f", 'distance_km', ROUND((6371 * acos(cos(radians({lat})) * cos(radians(d.current_latitude)) * cos(radians(d.current_longitude) - radians({lon})) + sin(radians({lat})) * sin(radians(d.current_latitude))))::numeric, 2)"
            order_clause = f"ORDER BY (6371 * acos(cos(radians({lat})) * cos(radians(d.current_latitude)) * cos(radians(d.current_longitude) - radians({lon})) + sin(radians({lat})) * sin(radians(d.current_latitude)))) ASC"
        elif location:
            where_clause += f" AND d.current_area_label ILIKE '%{location}%'"

        select_clause = f"SELECT json_build_object('vehicle_name', v.vehicle_name, 'vehicle_type', v.vehicle_type, 'model', v.model, 'driver_name', d.full_name, 'base_fare', v.base_fare, 'per_km_rate', v.per_km_rate, 'current_area', d.current_area_label{distance_sql})"
        
        sql = f"{select_clause} {from_clause} {where_clause} {order_clause} LIMIT 5;"
        
        try:
            result = self.db.run(sql)
            if not result or result == "[]" or result == "[(None,)]":
                return f"No cabs found currently available in that location."
            
            return f"Found cabs: {result}. When you reply, give them the link format: http://127.0.0.1:5174/cabs"
        except Exception as e:
            print(f"[SQL ERROR]: {e}")
            return "Error searching for cabs."

    def _search_flights_tool_logic(self, destination: str, origin: str = "") -> str:
        """Searches the database for flights"""
        print(f"[ACTION] Searching DB for Flights to '{destination}' from '{origin}'")
        if not self._init_database():
            return "Database unavailable."

        select_clause = f"SELECT json_build_object('flight_number', payload->>'flightNumber', 'from', payload->>'from', 'to', payload->>'to', 'depart_time', payload->>'departTime', 'arrive_time', payload->>'arriveTime', 'economy_price', payload->>'economyPrice')"
        from_clause = "FROM flight_documents"
        where_clause = f"WHERE collection = 'flights' AND payload->>'status' = 'Active'"
        
        if destination and destination.lower() != "anywhere":
            where_clause += f" AND payload->>'to' ILIKE '%{destination}%'"
            
        if origin:
            # Handle Calicut/Kozhikode aliases
            if origin.lower() == "kozhikode":
                where_clause += f" AND (payload->>'from' ILIKE '%kozhikode%' OR payload->>'from' ILIKE '%calicut%' OR payload->>'from' ILIKE '%CCJ%')"
            else:
                where_clause += f" AND payload->>'from' ILIKE '%{origin}%'"

        sql = f"{select_clause} {from_clause} {where_clause} LIMIT 5;"
        
        try:
            result = self.db.run(sql)
            if not result or result == "[]" or result == "[(None,)]":
                return f"No flights found matching that route."
            
            return f"Found flights: {result}. When you reply, give them the link format: http://127.0.0.1:5174/flights"
        except Exception as e:
            print(f"[SQL ERROR]: {e}")
            return "Error searching for flights."

    def _create_agent(self):
        search_food_tool = StructuredTool.from_function(
            func=self._search_food_tool_logic,
            name="search_food",
            description="Look up food items in the restaurant menu. Always use this when the user asks for food.",
            args_schema=FoodSearchInput,
        )

        search_hotels_tool = StructuredTool.from_function(
            func=self._search_hotels_tool_logic,
            name="search_hotels",
            description="Searches for hotels. Pass the query and optional location.",
            args_schema=HotelSearchInput,
        )

        search_cabs_tool = StructuredTool.from_function(
            func=self._search_cabs_tool_logic,
            name="search_cabs",
            description="Searches for available cabs or rides. Pass the pickup location.",
            args_schema=CabSearchInput,
        )

        search_flights_tool = StructuredTool.from_function(
            func=self._search_flights_tool_logic,
            name="search_flights",
            description="Searches for flights. Pass the destination and optional origin.",
            args_schema=FlightSearchInput,
        )

        tools = [search_food_tool, search_hotels_tool, search_cabs_tool, search_flights_tool]

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are Zahi Connect's AI Assistant, a friendly and intelligent conversational agent.
            We provide 4 services: Restaurants, Hotels, Cabs, and Flights.

            CONVERSATIONAL RULES:
            - You CAN answer casual questions related to food, travel, hotels, and cabs naturally (e.g., "Is Mandi good for health?", "What is a good place to visit?"). Be helpful and conversational!
            - If the user says "ok", "thanks", or asks a casual question, DO NOT repeat previous search results. Just answer them naturally.
            - If the user asks OUT-OF-SCOPE questions (e.g., "Who is the president?", "Write code"), politely refuse and say you only assist with Zahi Connect's food and travel services.

            BOOKING & ORDERING RULES:
            - ONLY when the user explicitly wants to FIND, BUY, or ORDER food, hotel, cab, or flight, follow these steps:
              1. For Cabs: You MUST have their exact GPS location. If they only give a text city, politely refuse to search and say "To find the nearest cabs for pickup, please share your real-time location using the WhatsApp 📎 Paperclip -> Location feature! 📍".
              2. For Food/Hotels: Do you know their city/area OR their GPS coordinates? If NO, ask them.
              3. For Flights: Do you know the destination? If NO, ask them.
              4. ONLY when you have the required location/destination, use the appropriate tool (`search_food`, `search_hotels`, `search_cabs`, `search_flights`), passing their query and location/GPS.
            - When you find food, give the link: http://127.0.0.1:5174/restaurants/<slug>?focus=<id>&add=1
            - When you find a hotel, give the link: http://127.0.0.1:5174/hotels/<slug>
            - When you find a cab, give the link: http://127.0.0.1:5174/cabs
            - When you find a flight, give the link: http://127.0.0.1:5174/flights
            - If the search results indicate 'available_rooms', explicitly tell the user how many rooms are currently available!
            - If the search results indicate 'distance_km', explicitly tell the user how many km away it is.
            - Keep your tone friendly, human-like, and use emojis!
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

    async def process_query(self, user_query: str, phone_number: str, memory: ConversationBufferMemory, lat: str | None = None, lon: str | None = None) -> str:
        try:
            # If user sent a Pin Drop, Body might be empty
            if not user_query.strip() and lat and lon:
                user_query = "Here is my location pin."
                
            print(f"\n[AGENT START] Message from {phone_number}: {user_query}")
            
            # Inject GPS into the user's message if they sent a pin
            if lat and lon:
                user_query += f"\n[SYSTEM: User shared WhatsApp GPS Location. Latitude: {lat}, Longitude: {lon}. Use these in the search tool!]"
                
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
