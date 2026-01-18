import time
import requests
import streamlit as st
import os

API_BASE = os.getenv("API_BASE", "http://127.0.0.1:8000")

st.set_page_config(page_title="DocAgent RAG", page_icon="📄", layout="centered")
st.title("DocAgent RAG (Streamlit temporary UI)")
st.caption("Streamlit → FastAPI → Inngest → Qdrant. Metadata in Neon Postgres.")

st.header("1) Upload PDF")
uploaded = st.file_uploader("Choose a PDF", type=["pdf"], accept_multiple_files=False)

if uploaded is not None:
    if st.button("Upload & Ingest"):
        with st.spinner("Uploading..."):
            files = {"file": (uploaded.name, uploaded.getvalue(), "application/pdf")}
            r = requests.post(f"{API_BASE}/documents", files=files, timeout=60)
            if r.status_code != 200:
                st.error(r.text)
            else:
                data = r.json()
                st.success("Uploaded")
                st.json(data)

st.divider()

st.header("2) Ask (Agentic RAG)")
doc_id = st.text_input("Optional: doc_id (scope search to a single PDF)")
question = st.text_input("Question / request")
top_k = st.number_input("top_k", min_value=1, max_value=20, value=6, step=1)

def wait_job(event_id: str, timeout_s: float = 120.0, poll_s: float = 0.5):
    start = time.time()
    while True:
        jr = requests.get(f"{API_BASE}/jobs/{event_id}", timeout=30)
        jr.raise_for_status()
        payload = jr.json()
        status = payload.get("status")

        if status in ("Completed", "Succeeded", "Success", "Finished"):
            return payload.get("output") or {}

        if status in ("Failed", "Cancelled"):
            raise RuntimeError(f"Job {status}: {payload.get('error')}")

        if time.time() - start > timeout_s:
            raise TimeoutError(f"Timed out. Last status: {status}")

        time.sleep(poll_s)

if st.button("Ask"):
    if not question.strip():
        st.warning("Enter a question.")
    else:
        with st.spinner("Submitting query..."):
            body = {"question": question.strip(), "top_k": int(top_k)}
            if doc_id.strip():
                body["doc_id"] = doc_id.strip()

            r = requests.post(f"{API_BASE}/query", json=body, timeout=30)
            r.raise_for_status()
            event_id = r.json()["query_event_id"]

        with st.spinner("Waiting for result..."):
            out = wait_job(event_id)

        st.subheader("Result")
        st.json(out)

        if out.get("needs_clarification"):
            st.warning(out.get("clarifying_question") or "Needs clarification.")

        if out.get("answer"):
            st.markdown("### Answer")
            st.write(out["answer"])

        if out.get("citations"):
            st.markdown("### Citations")
            for c in out["citations"]:
                st.write(f"- **{c.get('source','')}** | `{c.get('chunk_id','')}`")
                q = c.get("quote")
                if q:
                    st.caption(q)
