# ArşivAsistanı

This is a Next.js application using Genkit for AI features, ShadCN for UI components, and Zustand for state management. It allows users to scan vehicle registration documents and labels using OCR (via AI) and archive the extracted information.

## Getting Started

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Set up Environment Variables:**
    Create a `.env` file in the root directory and add your Google Generative AI API key:
    ```env
    GOOGLE_GENAI_API_KEY=YOUR_API_KEY
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```
    This will start the Next.js app (usually on http://localhost:9002).

4.  **(Optional) Run the Genkit development flow server:**
    If you need to test or debug the Genkit flows directly, you can run the Genkit development server:
    ```bash
    npm run genkit:dev
    ```
    Or with watching for changes:
    ```bash
    npm run genkit:watch
    ```
    This usually starts on a different port (check the console output). Note that the Next.js app interacts with the flows directly using server functions, so running `genkit:dev` separately is mainly for debugging the flows themselves.

## Backing Up to GitHub

To back up your project to a GitHub repository:

1.  **Initialize Git (if you haven't already):**
    ```bash
    git init
    ```

2.  **Stage all your project files:**
    ```bash
    git add .
    ```

3.  **Create your first commit:**
    ```bash
    git commit -m "Initial commit"
    ```

4.  **Create a new repository on GitHub.** (e.g., `my-arsiv-asistani`)

5.  **Add the GitHub repository as the remote origin:**
    Replace `<your-github-repo-url>` with the URL provided by GitHub (e.g., `https://github.com/your-username/my-arsiv-asistani.git`).
    ```bash
    git remote add origin <your-github-repo-url>
    ```

6.  **Rename the default branch to `main` (common practice):**
    ```bash
    git branch -M main
    ```

7.  **Push your code to GitHub:**
    ```bash
    git push -u origin main
    ```

Now your project code is backed up on GitHub. For future updates, use `git add .`, `git commit -m "Your commit message"`, and `git push`.
