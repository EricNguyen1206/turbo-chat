import { Request, Response } from 'express';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import { logger } from '@/utils/logger';

const execAsync = util.promisify(exec);

// Assuming skills are installed in ~/.openclaw/skills or similar, as per ClawX implementation
const OPENCLAW_DIR = path.join(process.env['HOME'] || process.env['USERPROFILE'] || '', '.openclaw');
const SKILLS_DIR = path.join(OPENCLAW_DIR, 'skills');

export class SkillsController {

  /**
   * Helper to run clawhub CLI commands
   */
  private async runClawHubCommand(command: string): Promise<string> {
    try {
      // Use npx to run clawhub. We set the working directory to OPENCLAW_DIR
      // to match the behavior of the ClawX electron app.
      const { stdout, stderr } = await execAsync(`npx clawhub ${command}`, {
        cwd: OPENCLAW_DIR,
        env: {
          ...process.env,
          CLAWHUB_WORKDIR: OPENCLAW_DIR,
          FORCE_COLOR: '0',
          CI: 'true',
        }
      });

      if (stderr && !stderr.includes('npm WARN')) {
        logger.warn(`ClawHub stderr for command '${command}':`, stderr);
      }
      return stdout.trim();
    } catch (error: any) {
      logger.error(`ClawHub command failed: ${command}`, error);
      throw new Error(`Command failed: ${error.message || error}`);
    }
  }

  /**
   * Parse Clawhub list output
   * Expected format: slug v1.0.0
   */
  private parseListOutput(output: string) {
    if (!output || output.includes('No installed skills')) {
      return [];
    }

    const lines = output.split('\n').filter(l => l.trim());
    return lines.map(line => {
      const match = line.match(/^(\S+)\s+v?(\d+\.\S+)/);
      if (match) {
        return {
          slug: match[1],
          version: match[2],
        };
      }
      return null;
    }).filter(s => s !== null);
  }

  /**
   * Parse Clawhub search/explore output
   */
  private parseSearchOutput(output: string) {
    if (!output || output.includes('No skills found')) {
      return [];
    }

    const lines = output.split('\n').filter(l => l.trim());
    return lines.map(line => {
      // Format: slug vversion time description
      // Example: my-skill v1.0.0 2 hours ago A great skill
      const exploreMatch = line.match(/^(\S+)\s+v?(\d+\.\S+)\s+(.+? ago|just now|yesterday)\s+(.+)$/i);
      if (exploreMatch) {
        return {
          slug: exploreMatch[1],
          name: exploreMatch[1],
          version: exploreMatch[2],
          description: exploreMatch[4] ? exploreMatch[4].replace(/\(\d+\.\d+\)$/, '').trim() : '', // strip score
        };
      }

      // Format: slug vversion description (score)
      const searchMatch = line.match(/^(\S+)\s+v?(\d+\.\S+)\s+(.+)$/);
      if (searchMatch) {
        return {
          slug: searchMatch[1],
          name: searchMatch[1],
          version: searchMatch[2],
          description: searchMatch[3] ? searchMatch[3].replace(/\(\d+\.\d+\)$/, '').trim() : '', // strip score
        };
      }

      return null;
    }).filter(s => s !== null);
  }

  /**
   * GET /api/v1/skills/list
   * Returns a list of installed skills
   */
  async listInstalled(_req: Request, res: Response): Promise<void> {
    try {
      const output = await this.runClawHubCommand('list');
      const skills = this.parseListOutput(output);
      res.status(200).json({ success: true, skills });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to list skills', error: error.message });
    }
  }

  /**
   * GET /api/v1/skills/explore
   * Explore trending skills
   */
  async explore(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : undefined;
      let cmd = 'explore';
      if (limit) cmd += ` --limit ${limit}`;

      const output = await this.runClawHubCommand(cmd);
      const skills = this.parseSearchOutput(output);
      res.status(200).json({ success: true, skills });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to explore skills', error: error.message });
    }
  }

  /**
   * GET /api/v1/skills/search?q=query
   * Search for skills
   */
  async search(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query['q'] as string;
      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : undefined;

      if (!query || query.trim() === '') {
        // Fallback to explore if query is empty
        return this.explore(req, res);
      }

      let cmd = `search "${query.replace(/"/g, '\\"')}"`;
      if (limit) cmd += ` --limit ${limit}`;

      const output = await this.runClawHubCommand(cmd);
      const skills = this.parseSearchOutput(output);
      res.status(200).json({ success: true, skills });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to search skills', error: error.message });
    }
  }

  /**
   * POST /api/v1/skills/install
   * Install a skill
   */
  async install(req: Request, res: Response): Promise<void> {
    try {
      const { slug, version, force } = req.body;
      if (!slug) {
        res.status(400).json({ success: false, message: 'Slug is required' });
        return;
      }

      let cmd = `install ${slug}`;
      if (version) cmd += ` --version ${version}`;
      if (force) cmd += ` --force`;

      await this.runClawHubCommand(cmd);
      res.status(200).json({ success: true, message: `Successfully installed ${slug}` });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to install skill', error: error.message });
    }
  }

  /**
   * POST /api/v1/skills/uninstall
   * Uninstall a skill
   */
  async uninstall(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.body;
      if (!slug) {
        res.status(400).json({ success: false, message: 'Slug is required' });
        return;
      }

      // 1. Delete the skill directory
      const skillDir = path.join(SKILLS_DIR, slug);
      if (fs.existsSync(skillDir)) {
        await fs.promises.rm(skillDir, { recursive: true, force: true });
      }

      // 2. Remove from lock.json
      const lockFile = path.join(OPENCLAW_DIR, '.clawhub', 'lock.json');
      if (fs.existsSync(lockFile)) {
        try {
          const lockData = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
          if (lockData.skills && lockData.skills[slug]) {
            delete lockData.skills[slug];
            await fs.promises.writeFile(lockFile, JSON.stringify(lockData, null, 2));
          }
        } catch (err: any) {
          logger.error('Failed to update ClawHub lock file:', err);
        }
      }

      res.status(200).json({ success: true, message: `Successfully uninstalled ${slug}` });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to uninstall skill', error: error.message });
    }
  }
}
