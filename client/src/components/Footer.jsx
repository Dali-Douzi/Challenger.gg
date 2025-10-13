import React from "react";
import { Box, Typography, Container, Link, IconButton, Stack, Divider } from "@mui/material";
import TwitterIcon from "@mui/icons-material/Twitter";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import { GitHub, Discord } from "@mui/icons-material";

/**
 * Footer Component
 * Professional footer with branding, links, and social media
 */
const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        py: 6,
        mt: "auto",
        backgroundColor: "background.paper",
        borderTop: "2px solid",
        borderColor: "divider",
      }}
    >
      <Container maxWidth="lg">
        {/* Three-column layout */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 4,
            mb: 4,
          }}
        >
          {/* Branding */}
          <Box>
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                fontWeight: "bold",
                background: "linear-gradient(45deg, #00FFFF 30%, #FF00FF 90%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Challenger
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              The ultimate esports platform connecting{" "}
              <Box
                component="span"
                sx={{
                  color: "primary.main",
                  fontWeight: 600,
                }}
              >
                teams
              </Box>
              ,{" "}
              <Box
                component="span"
                sx={{
                  color: "secondary.main",
                  fontWeight: 600,
                }}
              >
                scrims
              </Box>
              , and{" "}
              <Box
                component="span"
                sx={{
                  color: "warning.main",
                  fontWeight: 600,
                }}
              >
                tournaments
              </Box>{" "}
              worldwide.
            </Typography>
          </Box>

          {/* Quick Links */}
          <Box>
            <Typography
              variant="subtitle1"
              gutterBottom
              sx={{
                color: "primary.main",
                fontWeight: 600,
                mb: 2,
              }}
            >
              Quick Links
            </Typography>
            <Stack spacing={1}>
              {[
                { label: "Teams", path: "/teams" },
                { label: "Scrims", path: "/scrims" },
                { label: "Tournaments", path: "/tournaments" },
                { label: "Contact Us", path: "/contact" },
              ].map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  variant="body2"
                  sx={{
                    color: "text.primary",
                    textDecoration: "none",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      color: "primary.main",
                      textDecoration: "underline",
                      paddingLeft: "4px",
                    },
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </Stack>
          </Box>

          {/* Social Media */}
          <Box>
            <Typography
              variant="subtitle1"
              gutterBottom
              sx={{
                color: "primary.main",
                fontWeight: 600,
                mb: 2,
              }}
            >
              Follow Us
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Stay connected with our community
            </Typography>
            <Stack direction="row" spacing={1}>
              {[
                { icon: <TwitterIcon />, url: "https://twitter.com", label: "Twitter" },
                { icon: <FacebookIcon />, url: "https://facebook.com", label: "Facebook" },
                { icon: <InstagramIcon />, url: "https://instagram.com", label: "Instagram" },
                { icon: <GitHub />, url: "https://github.com", label: "GitHub" },
                { icon: <Discord />, url: "https://discord.com", label: "Discord" },
              ].map((social) => (
                <IconButton
                  key={social.label}
                  component="a"
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  sx={{
                    color: "text.secondary",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      color: "primary.main",
                      transform: "translateY(-4px)",
                      backgroundColor: "rgba(0, 255, 255, 0.08)",
                    },
                  }}
                >
                  {social.icon}
                </IconButton>
              ))}
            </Stack>
          </Box>
        </Box>

        <Divider sx={{ mb: 3, opacity: 0.6 }} />

        {/* Copyright and Legal Links */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © {currentYear}{" "}
            <Box
              component="span"
              sx={{
                background: "linear-gradient(45deg, #00FFFF 30%, #FF00FF 90%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: 600,
              }}
            >
              Challenger
            </Box>
            . All rights reserved.
          </Typography>

          <Stack direction="row" spacing={2}>
            {[
              { label: "Privacy Policy", path: "/privacy" },
              { label: "Terms of Service", path: "/terms" },
              { label: "Cookie Policy", path: "/cookies" },
            ].map((link) => (
              <Link
                key={link.path}
                href={link.path}
                variant="caption"
                sx={{
                  color: "text.secondary",
                  textDecoration: "none",
                  transition: "color 0.3s ease",
                  "&:hover": {
                    color: "primary.main",
                    textDecoration: "underline",
                  },
                }}
              >
                {link.label}
              </Link>
            ))}
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;