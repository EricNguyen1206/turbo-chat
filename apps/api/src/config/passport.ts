import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GithubStrategy } from 'passport-github2';
import { AuthService } from '../services/auth.service';
import { config } from './config';
import { logger } from '@/utils/logger';

const authService = new AuthService();

// Ensure base URL is correctly formed
const apiBaseUrl = process.env['API_BASE_URL'] ?? `http://localhost:${config.app.port}`;

// Only register Google OAuth strategy if credentials are provided
const googleClientId = process.env['GOOGLE_CLIENT_ID'];
const googleClientSecret = process.env['GOOGLE_CLIENT_SECRET'];

if (googleClientId && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: `${apiBaseUrl}/api/v1/auth/google/callback`,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const emailEntry = profile.emails && profile.emails[0];
          const email = emailEntry ? emailEntry.value : null;
          if (!email) {
            return done(new Error('No email found from Google profile'), false);
          }

          const photoEntry = profile.photos && profile.photos[0];
          const avatar = photoEntry ? photoEntry.value : undefined;

          const oauthProfile = avatar !== undefined
            ? { provider: 'google' as const, providerId: profile.id, email, name: profile.displayName, avatar }
            : { provider: 'google' as const, providerId: profile.id, email, name: profile.displayName };

          const user = await authService.findOrCreateOAuthUser(oauthProfile);

          done(null, user);
        } catch (error) {
          done(error, false);
        }
      }
    )
  );
  logger.info('✅ Google OAuth strategy registered');
} else {
  logger.warn('⚠️  GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set — Google OAuth disabled');
}

// Only register GitHub OAuth strategy if credentials are provided
const githubClientId = process.env['GITHUB_CLIENT_ID'];
const githubClientSecret = process.env['GITHUB_CLIENT_SECRET'];

if (githubClientId && githubClientSecret) {
  passport.use(
    new GithubStrategy(
      {
        clientID: githubClientId,
        clientSecret: githubClientSecret,
        callbackURL: `${apiBaseUrl}/api/v1/auth/github/callback`,
        scope: ['user:email'],
      },
      async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
        try {
          // GitHub might not return public email in profile directly,
          // but passport-github2 fetches emails when scope includes 'user:email'
          const emailEntry = profile.emails && profile.emails[0];
          const email = emailEntry ? emailEntry.value : null;
          if (!email) {
            return done(new Error('No email found from GitHub profile. Please ensure your email is public or grant email access.'), false);
          }

          const photoEntry = profile.photos && profile.photos[0];
          const avatar = photoEntry ? photoEntry.value : undefined;

          const oauthProfile = avatar !== undefined
            ? { provider: 'github' as const, providerId: profile.id, email, name: profile.displayName || profile.username, avatar }
            : { provider: 'github' as const, providerId: profile.id, email, name: profile.displayName || profile.username };

          const user = await authService.findOrCreateOAuthUser(oauthProfile);

          done(null, user);
        } catch (error) {
          done(error, false);
        }
      }
    )
  );
  logger.info('✅ GitHub OAuth strategy registered');
} else {
  logger.warn('⚠️  GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET not set — GitHub OAuth disabled');
}

export default passport;
