# Dockerfile for testing @effect-native/libsqlite on Linux
FROM nixos/nix:latest

# Install bun for testing
RUN nix-channel --add https://nixos.org/channels/nixpkgs-unstable nixpkgs && \
    nix-channel --update && \
    nix-env -iA nixpkgs.bun

WORKDIR /workspace
COPY . .

# Build the SQLite library for Linux
RUN nix build .#libsqlite3

# Install npm dependencies
RUN bun install

# Build the production distribution
RUN bun run build-production

# Verify the library works by running tests
CMD ["bun", "test", "dist.test.ts"]