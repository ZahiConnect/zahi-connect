import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from config import settings


class RestaurantVectorStore:
    def __init__(self, *, tenant_id: str, api_key: str):
        self.tenant_id = tenant_id
        self.collection_name = f"zahi_restaurant_{tenant_id}".replace("-", "_")
        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            google_api_key=api_key,
        )
        chroma_client = chromadb.HttpClient(
            host=settings.CHROMA_HOST,
            port=settings.CHROMA_PORT,
            settings=ChromaSettings(anonymized_telemetry=False),
        )

        self.vectorstore = Chroma(
            client=chroma_client,
            collection_name=self.collection_name,
            embedding_function=embeddings,
        )

    def sync_menu_items(self, items: list[dict]):
        documents = []
        ids = []

        for item in items:
            item_id = str(item["id"])
            delivery_price = item.get("delivery_price")
            documents.append(
                Document(
                    page_content=(
                        f"Menu item: {item['name']}. "
                        f"Category: {item.get('category_name', 'Uncategorized')}. "
                        f"Description: {item.get('description') or 'No description provided.'} "
                        f"Dine-in price: Rs {float(item['dine_in_price']):.2f}. "
                        f"Delivery price: "
                        f"{f'Rs {float(delivery_price):.2f}' if delivery_price is not None else 'same as dine-in'}. "
                        f"Food type: {item.get('food_type', 'unknown')}. "
                        f"Available: {'yes' if item.get('is_available') else 'no'}. "
                        f"Prep time: {item.get('prep_time_minutes', 0)} minutes."
                    ),
                    metadata={
                        "tenant_id": self.tenant_id,
                        "item_id": item_id,
                        "category_name": item.get("category_name", "Uncategorized"),
                        "food_type": item.get("food_type", "unknown"),
                        "is_available": bool(item.get("is_available")),
                    },
                )
            )
            ids.append(item_id)

        if not documents:
            return

        try:
            self.vectorstore.delete(ids=ids)
        except Exception:
            pass

        self.vectorstore.add_documents(documents=documents, ids=ids)

    def search(self, query: str, *, limit: int = 4) -> list[Document]:
        return self.vectorstore.similarity_search(query, k=limit)
