# Dockerfile for testing @effect-native/libsqlite on Linux
FROM oven/bun:latest

WORKDIR /workspace

# Copy the built distribution and test file
COPY dist/ ./dist/
COPY dist.test.ts ./

# Verify the library works by running tests  
CMD ["bun", "test", "dist.test.ts"]