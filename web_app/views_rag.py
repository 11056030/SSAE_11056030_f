
import os
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_openai import AzureOpenAIEmbeddings
from langchain import hub
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain.chat_models import AzureChatOpenAI

# 載入 .env 檔案中的環境變數
load_dotenv()

# 檢查必要的環境變數是否存在
required_env_vars = [
    "AZURE_OPENAI_API_KEY",
    "AZURE_OPENAI_ENDPOINT",
    "AZURE_OPENAI_API_VERSION",
    "AZURE_OPENAI_DEPLOYMENT_NAME",
    "AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME"
]

missing_vars = [var for var in required_env_vars if not os.getenv(var)]
if missing_vars:
    raise ValueError(f"缺少必要的環境變數：{', '.join(missing_vars)}")

# 初始化 Azure OpenAI 模型
llm = AzureChatOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
)

# 初始化 Azure OpenAI 嵌入模型
embeddings = AzureOpenAIEmbeddings(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    azure_deployment=os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME")
)

def test_basic_llm():
    """測試基本 LLM 回應（未使用 RAG）"""
    system_prompt = (
        "You are an assistant for question-answering tasks. "
        "Use the following pieces of retrieved context to answer "
        "the question. If you don't know the answer, say that you "
        "don't know. Use three sentences maximum and keep the "
        "answer concise."
        "\n\n"
        "{context}"
    )

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content="國立臺北商業大學學生進修學制單獨招生規定?"),
    ]

    return llm.invoke(messages)

def load_pdf_documents():
    """從專案中的 uploaded_files 資料夾載入 PDF 文件"""
    all_docs = []
    pdf_dir = os.path.join(os.path.dirname(__file__), "uploaded_files")  # 相對於當前 .py 檔案的 uploaded_files 資料夾

    for filename in os.listdir(pdf_dir):
        if filename.endswith(".pdf"):
            full_path = os.path.join(pdf_dir, filename)
            print(f"處理文件: {full_path}")
            loader = PyPDFLoader(full_path)
            docs = loader.load()
            all_docs.extend(docs)
    return all_docs


def split_documents(documents):
    """分割文件為較小的區塊"""
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100,
        add_start_index=True
    )
    return text_splitter.split_documents(documents)

def create_vector_store(splits):
    """建立向量資料庫"""
    return Chroma.from_documents(
        documents=splits,
        embedding=embeddings
    )

def create_rag_chain(retriever):
    """建立 RAG 鏈"""
    prompt = hub.pull("rlm/rag-prompt")
    
    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    return (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )

def create_advanced_rag_chain(retriever):
    """建立進階 RAG 鏈"""
    system_prompt = (
        "You are an assistant for question-answering tasks. "
        "Use the following pieces of retrieved context to answer "
        "the question. If you don't know the answer, say that you "
        "don't know. Use three sentences maximum and keep the "
        "answer concise."
        "\n\n"
        "{context}"
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
    ])

    question_answer_chain = create_stuff_documents_chain(llm, prompt)
    return create_retrieval_chain(retriever, question_answer_chain)

def main():
    # 載入文件
    all_docs = load_pdf_documents()
    print(f"載入文件數量: {len(all_docs)}")

    # 分割文件
    all_splits = split_documents(all_docs)
    print(f"分割後區塊數量: {len(all_splits)}")

    # 建立向量資料庫
    vectorstore = create_vector_store(all_splits)
    retriever = vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 2}
    )

    # 建立 RAG 鏈
    rag_chain = create_rag_chain(retriever)
    
    # 測試查詢
    query = "國立臺北商業大學學生進修學制單獨招生規定?"
    print("\n使用基本 RAG 鏈回答:")
    for chunk in rag_chain.stream(query):
        print(chunk, end="", flush=True)

    # 使用進階 RAG 鏈
    advanced_rag_chain = create_advanced_rag_chain(retriever)
    print("\n\n使用進階 RAG 鏈回答:")
    response = advanced_rag_chain.invoke({"input": query})
    print(response["answer"])

if __name__ == "__main__":
    main()