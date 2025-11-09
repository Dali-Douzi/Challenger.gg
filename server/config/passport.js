const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const DiscordStrategy = require("passport-discord").Strategy;
const TwitchStrategy = require("passport-twitch-new").Strategy;
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select("-password");
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.SERVER_URL || "http://localhost:4444"}/api/auth/google/callback`,
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log("Google OAuth callback triggered");
          console.log("Profile ID:", profile.id);

          // Check if user already exists with this Google ID
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            console.log("Existing Google user found:", user.email);
            return done(null, user);
          }

          // Check if user exists with the same email
          const email = profile.emails[0].value;
          user = await User.findOne({ email });

          if (user) {
            // Link Google account to existing user
            console.log("Linking Google account to existing user:", email);
            user.googleId = profile.id;
            if (!user.avatar && profile.photos && profile.photos.length > 0) {
              user.avatar = profile.photos[0].value;
            }
            await user.save();
            return done(null, user);
          }

          // Create new user
          console.log("Creating new user from Google OAuth");
          const username = profile.displayName.replace(/\s+/g, "_").toLowerCase() + Math.floor(Math.random() * 1000);
          
          // Generate a random password for OAuth users
          const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
          const salt = await bcrypt.genSalt(12);
          const hashedPassword = await bcrypt.hash(randomPassword, salt);

          user = new User({
            username,
            email,
            password: hashedPassword,
            googleId: profile.id,
            avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : "",
            authProvider: "google",
            teams: [],
          });

          await user.save();
          console.log("New Google user created:", user.email);
          done(null, user);
        } catch (error) {
          console.error("Google OAuth error:", error);
          done(error, null);
        }
      }
    )
  );
}

// Discord OAuth Strategy
if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  passport.use(
    new DiscordStrategy(
      {
        clientID: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        callbackURL: `${process.env.SERVER_URL || "http://localhost:4444"}/api/auth/discord/callback`,
        scope: ["identify", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log("Discord OAuth callback triggered");
          console.log("Profile ID:", profile.id);
          console.log("Profile avatar:", profile.avatar);

          // Construct Discord avatar URL
          const discordAvatarUrl = profile.avatar 
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${profile.avatar.startsWith('a_') ? 'gif' : 'png'}?size=256`
            : null;

          console.log("Discord avatar URL:", discordAvatarUrl);

          // Check if user already exists with this Discord ID
          let user = await User.findOne({ discordId: profile.id });

          if (user) {
            console.log("Existing Discord user found:", user.email);
            // Update Discord avatar on every login
            if (discordAvatarUrl) {
              user.discordAvatar = discordAvatarUrl;
              await user.save();
              console.log("Discord avatar updated:", discordAvatarUrl);
            }
            return done(null, user);
          }

          // Check if user exists with the same email
          const email = profile.email;
          if (!email) {
            return done(new Error("Discord account must have a verified email"), null);
          }

          user = await User.findOne({ email });

          if (user) {
            // Link Discord account to existing user
            console.log("Linking Discord account to existing user:", email);
            user.discordId = profile.id;
            if (discordAvatarUrl) {
              user.discordAvatar = discordAvatarUrl;
              // Only set general avatar if none exists
              if (!user.avatar) {
                user.avatar = discordAvatarUrl;
              }
            }
            await user.save();
            return done(null, user);
          }

          // Create new user
          console.log("Creating new user from Discord OAuth");
          const username = profile.username.replace(/\s+/g, "_").toLowerCase() + Math.floor(Math.random() * 1000);
          
          // Generate a random password for OAuth users
          const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
          const salt = await bcrypt.genSalt(12);
          const hashedPassword = await bcrypt.hash(randomPassword, salt);

          user = new User({
            username,
            email,
            password: hashedPassword,
            discordId: profile.id,
            discordAvatar: discordAvatarUrl || "",
            avatar: discordAvatarUrl || "",
            authProvider: "discord",
            teams: [],
          });

          await user.save();
          console.log("New Discord user created:", user.email);
          done(null, user);
        } catch (error) {
          console.error("Discord OAuth error:", error);
          done(error, null);
        }
      }
    )
  );
}

// Twitch OAuth Strategy
if (process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET) {
  passport.use(
    new TwitchStrategy(
      {
        clientID: process.env.TWITCH_CLIENT_ID,
        clientSecret: process.env.TWITCH_CLIENT_SECRET,
        callbackURL: `${process.env.SERVER_URL || "http://localhost:4444"}/api/auth/twitch/callback`,
        scope: ["user:read:email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log("Twitch OAuth callback triggered");
          console.log("Profile ID:", profile.id);

          // Check if user already exists with this Twitch ID
          let user = await User.findOne({ twitchId: profile.id });

          if (user) {
            console.log("Existing Twitch user found:", user.email);
            return done(null, user);
          }

          // Check if user exists with the same email
          const email = profile.email;
          if (!email) {
            return done(new Error("Twitch account must have a verified email"), null);
          }

          user = await User.findOne({ email });

          if (user) {
            // Link Twitch account to existing user
            console.log("Linking Twitch account to existing user:", email);
            user.twitchId = profile.id;
            if (!user.avatar && profile.profile_image_url) {
              user.avatar = profile.profile_image_url;
            }
            await user.save();
            return done(null, user);
          }

          // Create new user
          console.log("Creating new user from Twitch OAuth");
          const username = profile.login.replace(/\s+/g, "_").toLowerCase() + Math.floor(Math.random() * 1000);
          
          // Generate a random password for OAuth users
          const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
          const salt = await bcrypt.genSalt(12);
          const hashedPassword = await bcrypt.hash(randomPassword, salt);

          user = new User({
            username,
            email,
            password: hashedPassword,
            twitchId: profile.id,
            avatar: profile.profile_image_url || "",
            authProvider: "twitch",
            teams: [],
          });

          await user.save();
          console.log("New Twitch user created:", user.email);
          done(null, user);
        } catch (error) {
          console.error("Twitch OAuth error:", error);
          done(error, null);
        }
      }
    )
  );
}

module.exports = passport;