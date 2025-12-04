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
        
        # ❌ 原本的寫法：強制湊滿 6 個，容易有雜訊
        # retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 6})
        
        # ✅ 修改後的寫法：加上 score_threshold (相似度門檻)
        # 意思：最多找 k=6 個，但相似度必須高於 0.5 (score_threshold) 才會被採用
        # 門檻建議值：0.5 ~ 0.7 之間 (依據你的 Embeddings 模型調整，Azure OpenAI 建議從 0.5 或 0.6 試起)
        retriever = vectorstore.as_retriever(
            search_type="similarity_score_threshold", 
            search_kwargs={"score_threshold": 0.7, "k": 1}
        )
        
        advanced_rag_chain = create_advanced_rag_chain(retriever)
        print(f"✅ RAG 系統就緒 (讀取: {PERSIST_DIRECTORY})")
    except Exception as e:
        print(f"❌ 載入資料庫失敗: {e}")

# ==================== 查詢函式 (修正版) ====================
def ask_question(question: str, conversation_history: list = None) -> dict:
    # 1. 基礎檢查
    if not vectorstore:
        return {"answer": "系統維護中 (資料庫未載入)。", "has_sources": False, "sources": []}

    try:
        # 2. 準備「給 AI 看」的完整對話紀錄 (包含歷史)
        full_context_for_llm = question
        if conversation_history:
            # 只取最近 2 組對話以免 Token 爆炸
            recent = conversation_history[-2:]
            hist_txt = "\n".join([f"Human: {m['question']}\nAI: {m['answer']}" for m in recent])
            full_context_for_llm = f"【對話歷史】\n{hist_txt}\n\n【使用者新問題】\n{question}"

        # 3. 【關鍵修改】搜尋資料庫 (Retriever)
        # ★ 重點：只用「新問題 (question)」去搜尋，不要帶歷史紀錄！
        # 這樣才能精準找到「英文畢業門檻」的 PDF，不會被「產學合作」干擾。
        docs = retriever.invoke(question)

        # 4. 生成回答 (Generation)
        # 我們手動呼叫 qa_chain (create_stuff_documents_chain 產生的那個)
        # 把我們剛剛用「乾淨問題」搜到的 docs 餵給它
        # 但 input 依然給它「完整歷史」，這樣 AI 才知道你在跟它聊天
        
        # 這裡需要用到上面定義的 qa_chain，如果原本是在 create_advanced_rag_chain 裡定義的，
        # 建議把 qa_chain 拉出來變成全域變數，或者在這裡重新定義一次 prompt 和 chain
        
        # 為了保險起見，我們在這裡重新建立一個簡單的 chain 來回答
        system_prompt = (
            "You are a helpful assistant for National Taipei University of Business (NTUB). "
            "Use the retrieved context to answer the question accurately in Traditional Chinese. "
            "Use '## ' for sections and numbered lists for steps. "
            "If the documents don't have the answer, say so based on the context provided."
            "Always mention '根據國立臺北商業大學校規...' at the start."
            "\n\n{context}"
        )
        prompt = ChatPromptTemplate.from_messages([("system", system_prompt), ("human", "{input}")])
        manual_qa_chain = create_stuff_documents_chain(llm, prompt)
        
        # 執行生成
        response = manual_qa_chain.invoke({
            "input": full_context_for_llm, # 給 AI 看完整歷史 (懂上下文)
            "context": docs                # 給 AI 看精準搜到的資料 (懂校規)
        })
        
        raw_answer = response.strip()
        
        # 5. 來源處理 (跟原本一樣)
        pdf_sources = list(set([os.path.basename(doc.metadata.get('source', '')) for doc in docs if doc.metadata.get('source')]))
        
        # 6. 排版處理 (跟原本一樣)
        raw_answer = re.sub(r'\*\*([^*\n]+?)\*\*', r'<strong style="color:#4A5B73; font-weight:700;">\1</strong>', raw_answer)
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
        print(f"❌ 查詢錯誤: {e}") # 方便 debug
        return {"answer": "發生錯誤，請稍後再試。", "has_sources": False, "sources": []}