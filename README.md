<<<<<<< HEAD
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.
# KapsamDegerlendirme
=======
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
    **Important:** Ensure your `.env` file is listed in your `.gitignore` file to prevent accidentally committing your API key. If `.gitignore` doesn't exist or doesn't include `.env`, add `.env` on a new line in the `.gitignore` file.

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

To back up your project code to the **firebase-yedek-deposu** GitHub repository:

1.  **Initialize Git (if not already done):**
    If you haven't initialized a Git repository in your project folder yet, run:
    ```bash
    git init
    ```

2.  **Check Status:**
    See which files are tracked, untracked, or modified:
    ```bash
    git status
    ```

3.  **Add Files to Staging:**
    Add all new and modified files to the staging area for the next commit.
    ```bash
    git add .
    ```
    *Note:* Make sure your `.gitignore` file is correctly configured (especially to exclude `node_modules` and `.env`) before running `git add .`.

4.  **Commit Changes:**
    Save your staged changes with a descriptive message:
    ```bash
    git commit -m "Your descriptive commit message"
    ```
    *(Example: `git commit -m "feat: Implement user authentication"`)

5.  **Connect to the GitHub Repository:**

    *   **If this is the first time connecting to this repository:**
        a. Add the repository URL as the "remote origin" for your local repository:
           ```bash
           git remote add origin https://github.com/Y5tek/firebase-yedek-deposu.git
           ```
        b. Verify the remote connection:
           ```bash
           git remote -v
           ```
        (You should see the `firebase-yedek-deposu.git` URL listed for fetch and push).

    *   **If the remote 'origin' already exists but points to a different repository:**
        You can either remove the old origin (`git remote remove origin`) and then add the new one as above, or update the existing origin's URL:
        ```bash
        git remote set-url origin https://github.com/Y5tek/firebase-yedek-deposu.git
        ```
        Verify with `git remote -v`.

    *   **If connecting to an EXISTING repository with files (use with caution):**
        If the remote repository already has commits you don't have locally, you might need to pull changes first. This can get complex. A common approach is:
        ```bash
        git fetch origin
        # Check the branches (e.g., git branch -a)
        # Merge or rebase - CAUTION: This can create conflicts or rewrite history.
        git merge origin/main # Or the appropriate branch name (e.g., origin/master)
        # OR
        # git pull origin main --rebase
        ```
        Consult Git documentation if unsure.

6.  **Rename Default Branch (Optional but Recommended):**
    The standard default branch name is `main`. If your local default branch is different (e.g., `master`), rename it:
    ```bash
    git branch -M main
    ```

7.  **Push Your Code to GitHub:**
    Upload your local commits to the `main` branch of the `firebase-yedek-deposu` repository on GitHub. The `-u` flag sets the upstream branch for future pushes, so you can just use `git push` later.
    ```bash
    git push -u origin main
    ```
    *(If your branch isn't `main`, replace `main` with your branch name).*

**Future Backups:**

After the initial setup, your workflow for backing up changes will typically be:

1.  Make changes to your code.
2.  Stage the changes: `git add .` (or add specific files: `git add src/app/page.tsx`)
3.  Commit the changes: `git commit -m "Your new commit message"`
4.  Push the commits to GitHub: `git push origin main` (or just `git push` if upstream is set)
>>>>>>> a9db2ca8afb83ba1351aa9e9178e522abe459450
