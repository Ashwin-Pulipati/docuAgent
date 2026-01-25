<div align="center">
  <a href="https://github.com/Ashwin-Pulipati/docuAgent">
    <img src="client/public/logo.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">DocuAgent</h3>

  <p align="center">
    An intelligent, Agentic RAG-powered document assistant for seamless querying, summarization, and extraction from PDFs and their visual content (images, charts, diagrams).
    <br />
    <a href="https://docuagent.vercel.app"><strong>View Demo »</strong></a>
  </p>
</div>

## 📝 About The Project

DocuAgent is a powerful, full-stack Agentic AI RAG application designed to transform how users interact with their documents. Leveraging advanced Agentic RAG (Retrieval-Augmented Generation), it allows users to upload PDF documents or entire folders and chat with them naturally. Whether you need specific details, broad summaries, or data extraction from text and visuals, DocuAgent's intelligent agents work to provide accurate, citation-backed answers. It seamlessly processes both text and complex visual content (like charts and diagrams), ensuring no data point is left behind. With a modern, intuitive UI and robust document management features, it's the ultimate tool for researchers, professionals, and anyone dealing with information overload.

## ⚙️ Built With

This project is built with a cutting-edge tech stack ensuring performance, reliability, and a superior user experience.

*   **Frontend:** [Next.js](https://nextjs.org/) ([React.js](https://react.dev/))
*   **Backend:** [FastAPI](https://fastapi.tiangolo.com/) ([Python](https://www.python.org/))
*   **Database:** [PostgreSQL](https://www.postgresql.org/) with [SQLModel](https://sqlmodel.tiangolo.com/)
*   **Vector Store:** [Qdrant](https://qdrant.tech/)
*   **AI Orchestration:** [Inngest](https://www.inngest.com/)
*   **LLM Integration:** [OpenAI](https://platform.openai.com/) / [LlamaIndex](https://www.llamaindex.ai/)
*   **UI:** [Tailwind CSS](https://tailwindcss.com/) & [Shadcn/UI](https://ui.shadcn.com/)
*   **Deployment:** [Vercel](https://vercel.com/) (Frontend) & [Render](https://render.com/) (Backend)

## ✅ Key Features

- **🤖 Agentic RAG Logic:** Sophisticated reasoning loop that understands intent (**QA, Summarize, Extract, Clarify**) for more accurate, context-aware results.
- **📂 Document & Folder Management:** Organize your PDFs into folders and chat with individual documents or entire collections.
- **🛡️ Durable Workflows:** Powered by **Inngest**, ensuring 100% reliability for background tasks like PDF ingestion, chunking, and multi-step agentic reasoning.
- **👁️ Vision-Augmented Ingestion:** Integrated **Multimodal AI** to "see" and interpret images, charts, and diagrams within your PDFs, extracting text and insights from visual elements.
- **🌿 Branched Chat History:** Create multiple chat threads per document, rename them, and branch conversations to explore different topics without losing context.
- **🔍 Smart Citations:** Every answer comes with clickable citations that highlight the exact source text, page number, and source file.
- **🌡️ System Monitoring:** Real-time sensors for network status (offline/online detection) and device battery health to ensure uninterrupted workflows.
- **✨ AI Reactions:** The agent can react to your messages with emojis (👍, 🤔, 🎉) based on the conversation context.
- **🎨 Modern UX/UI:** A bleeding-edge **Next.js 16** and **React 19** frontend featuring a Glassmorphic design, fluid animations, and a responsive sidebar.

## 🏗️ System Architecture
<div align="center">
    <img src="https://github.com/user-attachments/assets/5b18d2fe-c8c8-45d0-81b7-9fa14d0fbb42" alt="DocuAgent System Architecture Diagram" width="900">
</div>
<br/>

DocuAgent is engineered as a high-performance Agentic RAG (Retrieval-Augmented Generation) platform. The architecture is purposefully decoupled into a high-concurrency API layer and a durable, event-driven background orchestration layer to handle complex document intelligence tasks.

### 1. Presentation & Interaction Layer
**Frontend (Next.js 16):** Leverages the latest React 19 patterns for a stream-first user experience. Custom hooks manage optimistic UI updates and real-time citation rendering during long-running agentic reasoning.

**Backend (FastAPI):** A high-performance Python gateway that acts as the system's "traffic controller". It utilizes SQLModel for type-safe relational mapping and manages multi-tenant file uploads to secure storage.

### 2. Durable Orchestration (Inngest Workflows)
**Asynchronous Ingestion Pipeline:** Document processing is offloaded to Inngest to ensure 100% reliability. This workflow manages PDF parsing, multimodal image analysis (extracting insights from figures), recursive character chunking, and parallel embedding generation, shielding the main thread from heavy computational loads.

**Agentic Reasoning Loop:** Query execution is treated as a durable state machine. The agent performs intent classification, multi-pass vector retrieval, and self-correction (Reflexion) before synthesizing the final grounded response.

### 3. Intelligence & Persistence Layer
**Vector Memory (Qdrant):** A high-performance vector database used for semantic retrieval. It stores high-dimensional embeddings and supports complex metadata filtering to ensure that citations point back to exact document coordinates.

**Relational Persistence (Postgres):** Manages structured data, including user workspaces, document metadata, and historical chat threads.

**AI Engine (OpenAI GPT-4o):** Powers the core reasoning engine, visual data extraction, embedding generation, and final synthesis of retrieved context into human-readable answers.


## ▶️ Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

Make sure you have the following installed:
*   Node.js (v18+)
*   Python (v3.12+)
*   Docker & Docker Compose (for the database and vector store)

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/Ashwin-Pulipati/DocuAgent.git
    cd DocuAgent
    ```

2.  **Start Infrastructure:**
    Use Docker Compose to start PostgreSQL and Qdrant.
    ```sh
    cd server
    docker-compose up -d
    ```

3.  **Backend Setup (Server):**
    ```sh
    # From the /server directory
    # Create a virtual environment
    python -m venv .venv
    
    # Activate it (Windows)
    .\.venv\Scripts\activate
    # Activate it (Mac/Linux)
    # source .venv/bin/activate

    # Install dependencies
    pip install -r requirements.txt # or use `uv sync` if configured

    # Run Migrations
    alembic upgrade head

    # Start the Server
    uvicorn app.main:app --reload
    ```

4.  **Frontend Setup (Client):**
    ```sh
    # Open a new terminal and navigate to /client
    cd ../client

    # Install dependencies
    npm install

    # Start the Development Server
    npm run dev
    ```

5.  **Environment Variables:**
    Ensure you have `.env` files set up in both `server/` and `client/` directories with necessary API keys (OpenAI, Database URLs, etc.).

6.  Open [http://localhost:3000](http://localhost:3000) in your browser to start using DocuAgent.

## 🚀 Usage

1.  **Upload:** Drag and drop PDFs into the sidebar or use the upload button.
2.  **Organize:** Create folders to group related documents (e.g., "Financial Reports 2024").
3.  **Chat:**
    *   Click a document to start a focused chat.
    *   Click a folder to query all documents inside it.
    *   Use the **(⋮)** menu on a document to "Create New Chat" for specific topics.
4.  **Refine:** Rename chats for clarity or branch off into new directions as your research deepens.

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See the [LICENSE](LICENSE) file for more information.

## 📧 Contact

Ashwin Pulipati - [LinkedIn](https://www.linkedin.com/in/ashwinpulipati/) - ashwinpulipati@gmail.com

Project Link: [https://github.com/Ashwin-Pulipati/DocuAgent](https://github.com/Ashwin-Pulipati/DocuAgent)
