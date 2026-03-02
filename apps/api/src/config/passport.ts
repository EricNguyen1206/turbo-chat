import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GithubStrategy } from 'passport-github2';
import { AuthService } from '../services/auth.service';
import { config } from './config';
import { googleConfig } from './google';

const authService = new AuthService();

// Ensure base URL is correctly formed
const apiBaseUrl = process.env['API_BASE_URL'] ?? `http://localhost:${config.app.port}`;

passport.use(
  new GoogleStrategy(
    {
      clientID: googleConfig.clientId,
      clientSecret: googleConfig.clientSecret,
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

passport.use(
  new GithubStrategy(
    {
      clientID: process.env['GITHUB_CLIENT_ID'] ?? '',
      clientSecret: process.env['GITHUB_CLIENT_SECRET'] ?? '',
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

export default passport;
