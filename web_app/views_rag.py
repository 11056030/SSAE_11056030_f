import os
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.vectorstores import Chroma
from langchain_openai import AzureOpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain.chat_models import AzureChatOpenAI
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain


# 載入 .env
load_dotenv()

def test_mongo_connection():
    MONGO_URI = os.getenv("MONGO_URI")

    if not MONGO_URI:
        print("❌ 找不到 MONGODB_URI 環境變數")
        return
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
        client.admin.command('ping')
        print("✅ MongoDB 連線成功。")
    except ConnectionFailure:
        print("❌ MongoDB 連線失敗")
    except Exception as e:
        print(f"❌ MongoDB 連線錯誤: {e}")

# 初始化 LLM
llm = AzureChatOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
)

# 初始化 Embedding 模型
embeddings = AzureOpenAIEmbeddings(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    azure_deployment=os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME")
)

# 讀取 PDF 文件
def load_pdf_documents():
    current_dir = os.path.dirname(__file__)
    parent_dir = os.path.dirname(current_dir)
    pdf_dir = os.path.join(parent_dir, "uploaded_files")
    all_docs = []
    if not os.path.exists(pdf_dir):
        print(f"⚠️ 找不到資料夾：{pdf_dir}")
        return []
    for filename in os.listdir(pdf_dir):
        if filename.endswith(".pdf"):
            full_path = os.path.join(pdf_dir, filename)
            print(f"📄 載入：{filename}")
            loader = PyPDFLoader(full_path)
            docs = loader.load()
            all_docs.extend(docs)
    return all_docs

# 分割文件
def split_documents(documents):
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100, add_start_index=True)
    return splitter.split_documents(documents)

# 建立向量資料庫
def create_vector_store(splits):
    return Chroma.from_documents(documents=splits, embedding=embeddings)

# 建立進階 RAG 鏈
def create_advanced_rag_chain(retriever):
    system_prompt = (
        "You are an assistant for question-answering tasks. "
        "Use the following pieces of retrieved context to answer "
        "the question. If you don't know the answer, say that you don't know. "
        "Use three sentences maximum and keep the answer concise.\n\n{context}"
    )
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
    ])
    qa_chain = create_stuff_documents_chain(llm, prompt)
    return create_retrieval_chain(retriever, qa_chain)

# 先測試 MongoDB 連線
print("🚀 測試 MongoDB 連線...")
test_mongo_connection()

# 初始化 RAG 系統
print("🚀 初始化進階 RAG 系統...")
docs = load_pdf_documents()
splits = split_documents(docs)
vectorstore = create_vector_store(splits)
retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 2})
advanced_rag_chain = create_advanced_rag_chain(retriever)
print("✅ 進階 RAG 系統初始化完成。")

# 查詢函式
def ask_question(question: str) -> str:
    response = advanced_rag_chain.invoke({"input": question})
    return response["answer"].strip()
