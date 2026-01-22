<div align="center">
  <a href="https://github.com/Ashwin-Pulipati/docuAgent">
    <img src="client/public/logo.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">DocuAgent</h3>

  <p align="center">
    An intelligent, Agentic RAG-powered document assistant for seamless querying, summarization, and extraction from PDFs.
    <br />
    <a href="https://github.com/Ashwin-Pulipati/docuAgent"><strong>View Demo »</strong></a>
  </p>
</div>

## 📝 About The Project

DocuAgent is a powerful, full-stack application designed to transform how users interact with their documents. Leveraging advanced Agentic RAG (Retrieval-Augmented Generation), it allows users to upload PDF documents or entire folders and chat with them naturally. Whether you need specific details, broad summaries, or data extraction, DocuAgent's intelligent agents work to provide accurate, citation-backed answers. With a modern, intuitive UI and robust document management features, it's the ultimate tool for researchers, professionals, and anyone dealing with information overload.

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

- **Agentic RAG:** sophisticated retrieval augmented generation that understands intent (QA, Summarize, Extract) for more accurate results.
- **Document & Folder Management:** Organize your PDFs into folders and chat with individual documents or entire collections.
- **Branched Chat History:** Create multiple chat threads per document, rename them, and branch conversations to explore different topics without losing context.
- **Smart Citations:** Every answer comes with clickable citations that highlight the exact source text and page number.
- **Context-Aware Sidebar:** A dynamic sidebar that adapts to your selection, showing relevant chats and document hierarchies.
- **Background Processing:** Seamless document ingestion and embedding handled by robust background jobs.

## ▶️ Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

Make sure you have the following installed:
*   Node.js (v18+)
*   Python (v3.10+)
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
