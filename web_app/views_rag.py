import os
import re
import markdown
from dotenv import load_dotenv
from langchain_community.vectorstores import Chroma
from langchain_openai import AzureOpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import AzureChatOpenAI
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain

load_dotenv()

# ==================== 路徑設定 ====================
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
PERSIST_DIRECTORY = os.path.join(project_root, "chroma_db_data")

# ==================== 初始化 AI ====================
embeddings = None
llm = None
try:
    embeddings = AzureOpenAIEmbeddings(
        api_key=os.getenv("AZURE_OPENAI_API_KEY"),
        api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
        azure_deployment=os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME")
    )
    llm = AzureChatOpenAI(
        api_key=os.getenv("AZURE_OPENAI_API_KEY"),
        api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
        azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
    )
    print("✅ AI 模型載入成功")
except Exception as e:
    print(f"❌ AI 模型載入失敗: {e}")

# ==================== 必要的空函式 (防止報錯) ====================
def load_pdf_documents(): return []
def split_documents(docs): return []
def create_vector_store(splits): return None

def create_advanced_rag_chain(retriever):
    system_prompt = (
        "You are a helpful assistant for National Taipei University of Business (NTUB). "
        "Use the retrieved context to answer the question accurately in Traditional Chinese. "
        "Use '## ' for sections and numbered lists for steps. "
        "Always mention '根據國立臺北商業大學校規...' at the start."
        "\n\n{context}"
    )
    prompt = ChatPromptTemplate.from_messages([("system", system_prompt), ("human", "{input}")])
    qa_chain = create_stuff_documents_chain(llm, prompt)
    return create_retrieval_chain(retriever, qa_chain)

# ==================== 初始化系統 (讀取模式) ====================
vectorstore = None
advanced_rag_chain = None

if os.path.exists(PERSIST_DIRECTORY) and embeddings:
    try:
        vectorstore = Chroma(persist_directory=PERSIST_DIRECTORY, embedding_function=embeddings)
        # k=6 增加搜尋廣度
        retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 6})
        advanced_rag_chain = create_advanced_rag_chain(retriever)
        print(f"✅ RAG 系統就緒 (讀取: {PERSIST_DIRECTORY})")
    except Exception as e:
        print(f"❌ 載入資料庫失敗: {e}")
else:
    print(f"⚠ 找不到資料庫: {PERSIST_DIRECTORY}")

# ==================== 查詢函式 ====================
def ask_question(question: str, conversation_history: list = None) -> dict:
    if not advanced_rag_chain:
        return {"answer": "系統維護中 (資料庫未載入)。", "has_sources": False, "sources": []}

    try:
        # 1. 歷史紀錄
        full_question = question
        if conversation_history:
            recent = conversation_history[-3:]
            hist_txt = "\n".join([f"Q: {m['question']}\nA: {m['answer']}" for m in recent])
            full_question = f"歷史紀錄：\n{hist_txt}\n\n新問題：{question}"

        # 2. 檢索與回答
        response = advanced_rag_chain.invoke({"input": full_question})
        raw_answer = response["answer"].strip()
        
        # 3. 來源處理
        source_documents = response.get("context", [])
        pdf_sources = list(set([os.path.basename(doc.metadata.get('source', '')) for doc in source_documents if doc.metadata.get('source')]))
        
        # 4. 簡單排版 (加強標題顯示，但不強制加 #)
        raw_answer = re.sub(r'\*\*([^*\n]+?)\*\*', r'<strong style="color:#4A5B73; font-weight:700;">\1</strong>', raw_answer)
        
        # 轉換 markdown 標題為 HTML 樣式
        lines = raw_answer.split('\n')
        formatted_lines = []
        for line in lines:
            line = line.strip()
            if not line: continue
            if line.startswith('###'):
                formatted_lines.append(f'<h3 style="color:#5B7296; margin:12px 0 6px 0; font-weight:650; font-size:1.2em;">{line.replace("###", "").strip()}</h3>')
            elif line.startswith('##'):
                formatted_lines.append(f'<h2 style="color:#4A668A; margin:15px 0 8px 0; font-weight:650; font-size:1.4em;">{line.replace("##", "").strip()}</h2>')
            elif line.startswith('#'):
                formatted_lines.append(f'<h1 style="color:#365073; margin:18px 0 10px 0; font-weight:650; font-size:1.6em;">{line.replace("#", "").strip()}</h1>')
            else:
                formatted_lines.append(f'<p style="margin:6px 0; line-height:1.6; color:#334455;">{line}</p>')
        
        return {
            "answer": ''.join(formatted_lines),
            "has_sources": len(pdf_sources) > 0,
            "sources": pdf_sources
        }
    except Exception as e:
        return {"answer": "發生錯誤，請稍後再試。", "has_sources": False, "sources": []}