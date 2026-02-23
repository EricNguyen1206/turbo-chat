import * as fs from 'fs';
import * as https from 'https';

// ============================================================================
// Types
// ============================================================================

interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

interface DiffLine {
  type: 'add' | 'delete' | 'context';
  content: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
  position: number; // Position in the diff (for GitHub API)
}

interface FileDiff {
  path: string;
  hunks: DiffHunk[];
  additions: string[];
  deletions: string[];
}

interface ReviewIssue {
  line: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  review: string;
  suggestion: string;
}

interface AIReviewResponse {
  issues: ReviewIssue[];
  summary: string;
}

interface GitHubReviewComment {
  path: string;
  position: number;
  body: string;
}

// ============================================================================
// Configuration
// ============================================================================

const OLLAMA_API_URL = 'https://ollama.com/api/chat';
const MODEL = process.env.OLLAMA_MODEL || 'kimi-k2.5:cloud';
const GITHUB_API_URL = 'https://api.github.com';

const isDryRun = process.argv.includes('--dry-run');

// ============================================================================
// Diff Parser
// ============================================================================

function parseDiff(diffText: string): FileDiff[] {
  const files: FileDiff[] = [];
  const filePattern = /^diff --git a\/(.+?) b\/(.+?)$/gm;
  const hunkPattern = /^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/;

  let match: RegExpExecArray | null;
  const fileMatches: { path: string; startIndex: number }[] = [];

  // Find all file headers
  while ((match = filePattern.exec(diffText)) !== null) {
    fileMatches.push({
      path: match[2],
      startIndex: match.index,
    });
  }

  // Parse each file's diff
  for (let i = 0; i < fileMatches.length; i++) {
    const fileMatch = fileMatches[i];
    const endIndex = i < fileMatches.length - 1
      ? fileMatches[i + 1].startIndex
      : diffText.length;

    const fileContent = diffText.slice(fileMatch.startIndex, endIndex);
    const lines = fileContent.split('\n');

    const fileDiff: FileDiff = {
      path: fileMatch.path,
      hunks: [],
      additions: [],
      deletions: [],
    };

    let currentHunk: DiffHunk | null = null;
    let position = 0; // Position counter for GitHub API
    let oldLine = 0;
    let newLine = 0;

    for (const line of lines) {
      const hunkMatch = line.match(hunkPattern);

      if (hunkMatch) {
        // New hunk header
        if (currentHunk) {
          fileDiff.hunks.push(currentHunk);
        }

        oldLine = parseInt(hunkMatch[1], 10);
        newLine = parseInt(hunkMatch[3], 10);

        currentHunk = {
          oldStart: oldLine,
          oldCount: parseInt(hunkMatch[2] || '1', 10),
          newStart: newLine,
          newCount: parseInt(hunkMatch[4] || '1', 10),
          lines: [],
        };
        position = 0;
      } else if (currentHunk && (line.startsWith('+') || line.startsWith('-') || line.startsWith(' '))) {
        position++;

        if (line.startsWith('+') && !line.startsWith('+++')) {
          const diffLine: DiffLine = {
            type: 'add',
            content: line.substring(1),
            oldLineNumber: null,
            newLineNumber: newLine,
            position,
          };
          currentHunk.lines.push(diffLine);
          fileDiff.additions.push(line.substring(1));
          newLine++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          const diffLine: DiffLine = {
            type: 'delete',
            content: line.substring(1),
            oldLineNumber: oldLine,
            newLineNumber: null,
            position,
          };
          currentHunk.lines.push(diffLine);
          fileDiff.deletions.push(line.substring(1));
          oldLine++;
        } else if (line.startsWith(' ')) {
          const diffLine: DiffLine = {
            type: 'context',
            content: line.substring(1),
            oldLineNumber: oldLine,
            newLineNumber: newLine,
            position,
          };
          currentHunk.lines.push(diffLine);
          oldLine++;
          newLine++;
        }
      }
    }

    if (currentHunk) {
      fileDiff.hunks.push(currentHunk);
    }

    if (fileDiff.hunks.length > 0) {
      files.push(fileDiff);
    }
  }

  return files;
}

// ============================================================================
// AI Integration
// ============================================================================

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 2000; // 2 seconds

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callOllamaAPIWithRetry(
  messages: Array<{ role: string; content: string }>,
  retryCount = 0
): Promise<string> {
  try {
    return await callOllamaAPI(messages);
  } catch (error) {
    const errorMessage = (error as Error).message;
    const isRetryable = errorMessage.includes('503') ||
      errorMessage.includes('502') ||
      errorMessage.includes('429') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('ECONNRESET');

    if (isRetryable && retryCount < MAX_RETRIES) {
      const delayMs = INITIAL_DELAY_MS * Math.pow(2, retryCount); // Exponential backoff
      console.error(`[WARN] API call failed (${errorMessage}). Retrying in ${delayMs}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await sleep(delayMs);
      return callOllamaAPIWithRetry(messages, retryCount + 1);
    }

    throw error;
  }
}

async function callOllamaAPI(messages: Array<{ role: string; content: string }>): Promise<string> {
  const apiKey = process.env.OLLAMA_API_KEY;

  if (!apiKey) {
    throw new Error('OLLAMA_API_KEY environment variable is not set');
  }

  const requestBody = JSON.stringify({
    model: MODEL,
    messages: messages,
    stream: false,
  });

  console.error(`[DEBUG] Using model: ${MODEL}`);

  return new Promise((resolve, reject) => {
    const url = new URL(OLLAMA_API_URL);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      timeout: 120000, // 2 minute timeout
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(requestBody),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`API returned status ${res.statusCode}: ${data}`));
          return;
        }

        try {
          const parsed = JSON.parse(data);
          if (parsed.message && parsed.message.content) {
            resolve(parsed.message.content);
          } else if (parsed.error) {
            reject(new Error(`Ollama API error: ${parsed.error}`));
          } else {
            reject(new Error(`Unexpected response format: ${data.substring(0, 200)}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${(e as Error).message}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout after 120 seconds'));
    });

    req.on('error', (e) => {
      reject(new Error(`Request failed: ${e.message}`));
    });

    req.write(requestBody);
    req.end();
  });
}


async function reviewFileChanges(file: FileDiff): Promise<AIReviewResponse> {
  const systemPrompt = `You are an expert code reviewer. Analyze the code changes and identify specific issues.

You MUST respond with valid JSON only. No markdown, no explanation, just JSON.

Response format:
{
  "issues": [
    {
      "line": <number - the new line number where the issue is>,
      "priority": "<HIGH|MEDIUM|LOW>",
      "review": "<brief description of the issue>",
      "suggestion": "<how to fix or improve>"
    }
  ],
  "summary": "<one sentence overall assessment>"
}

Focus on:
- HIGH: Security vulnerabilities, critical bugs, data loss risks
- MEDIUM: Logic errors, potential bugs, missing error handling
- LOW: Code style, readability, minor improvements

Rules:
1. Only report issues on ADDED lines (lines starting with +)
2. Use the line number from the new file
3. Be specific and actionable
4. If no issues found, return empty issues array
5. Maximum 10 issues per file`;

  // Build the diff content for this file
  let diffContent = '';
  for (const hunk of file.hunks) {
    diffContent += `@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@\n`;
    for (const line of hunk.lines) {
      const prefix = line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' ';
      const lineNum = line.newLineNumber ? ` (line ${line.newLineNumber})` : '';
      diffContent += `${prefix}${line.content}${lineNum}\n`;
    }
  }

  const userPrompt = `Review this file: ${file.path}

\`\`\`diff
${diffContent}
\`\`\`

Respond with JSON only.`;

  try {
    const response = await callOllamaAPIWithRetry([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr) as AIReviewResponse;
    return parsed;
  } catch (error) {
    console.error(`[ERROR] Failed to review ${file.path}:`, error);
    return { issues: [], summary: 'Review failed' };
  }
}

// ============================================================================
// GitHub API Integration
// ============================================================================

function findPositionForLine(file: FileDiff, targetLine: number): number | null {
  for (const hunk of file.hunks) {
    for (const line of hunk.lines) {
      if (line.type === 'add' && line.newLineNumber === targetLine) {
        return line.position;
      }
    }
  }
  return null;
}

function formatComment(issue: ReviewIssue): string {
  const priorityEmoji = {
    HIGH: '🔴',
    MEDIUM: '🟡',
    LOW: '🟢',
  };

  return `**${priorityEmoji[issue.priority]} Priority: ${issue.priority}**

**Review:** ${issue.review}

**Suggestion:** ${issue.suggestion}`;
}

async function createPRReview(
  comments: GitHubReviewComment[],
  summary: string
): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  const prNumber = process.env.PR_NUMBER;
  const commitId = process.env.COMMIT_SHA;

  if (!token || !repo || !prNumber || !commitId) {
    throw new Error('Missing required environment variables: GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, COMMIT_SHA');
  }

  const [owner, repoName] = repo.split('/');

  const requestBody = JSON.stringify({
    commit_id: commitId,
    body: summary,
    event: comments.length > 0 ? 'COMMENT' : 'APPROVE',
    comments: comments,
  });

  console.error(`[DEBUG] Creating PR review with ${comments.length} comments`);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repoName}/pulls/${prNumber}/reviews`,
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'AI-PR-Reviewer',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode !== 200) {
          console.error(`[ERROR] GitHub API response: ${data}`);
          reject(new Error(`GitHub API returned status ${res.statusCode}`));
          return;
        }
        console.error('[DEBUG] PR review created successfully');
        resolve();
      });
    });

    req.on('error', (e) => {
      reject(new Error(`GitHub API request failed: ${e.message}`));
    });

    req.write(requestBody);
    req.end();
  });
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  try {
    console.error('[INFO] Starting AI Code Review...');

    // Read the PR diff
    const diffPath = process.argv.find(arg => arg.startsWith('--diff='))?.split('=')[1] || 'pr_diff.txt';
    const diff = fs.readFileSync(diffPath, 'utf8');

    if (!diff.trim()) {
      console.log('## 🤖 AI Code Review\n\n✅ No changes detected in this PR.');
      return;
    }

    // Parse the diff
    const files = parseDiff(diff);
    console.error(`[INFO] Found ${files.length} files with changes`);

    if (files.length === 0) {
      console.log('## 🤖 AI Code Review\n\n✅ No reviewable changes detected.');
      return;
    }

    const allComments: GitHubReviewComment[] = [];
    const fileSummaries: string[] = [];

    // Review each file
    for (const file of files) {
      // Skip non-code files
      if (file.path.match(/\.(md|json|yaml|yml|lock|txt)$/i)) {
        console.error(`[INFO] Skipping non-code file: ${file.path}`);
        continue;
      }

      console.error(`[INFO] Reviewing: ${file.path}`);

      const review = await reviewFileChanges(file);

      if (review.issues.length > 0) {
        fileSummaries.push(`- **${file.path}**: ${review.issues.length} issue(s) found`);

        for (const issue of review.issues) {
          const position = findPositionForLine(file, issue.line);

          if (position !== null) {
            allComments.push({
              path: file.path,
              position: position,
              body: formatComment(issue),
            });
          } else {
            console.error(`[WARN] Could not find position for line ${issue.line} in ${file.path}`);
          }
        }
      } else {
        fileSummaries.push(`- **${file.path}**: ✅ No issues found`);
      }
    }

    // Build summary
    const summaryText = `## 🤖 AI Code Review

> Powered by Ollama Cloud (${MODEL})

### Summary
${fileSummaries.join('\n')}

**Total Issues: ${allComments.length}**

---
_This is an automated review. Please use your judgment when applying suggestions._`;

    if (isDryRun) {
      console.log('\n=== DRY RUN OUTPUT ===\n');
      console.log('Summary:', summaryText);
      console.log('\nComments:');
      for (const comment of allComments) {
        console.log(`\n[${comment.path}:position=${comment.position}]`);
        console.log(comment.body);
      }
    } else {
      // Create the PR review via GitHub API
      await createPRReview(allComments, summaryText);
      console.log(summaryText);
    }

  } catch (error) {
    console.error('[ERROR]', error);
    console.log(`## ⚠️ AI Code Review

Unable to complete automated review.

**Error:** ${(error as Error).message}

_Please review the PR manually._`);
    process.exit(1);
  }
}

main();
