# Run tests for sqlts package
test:
    pnpm --filter sqlts test:run

# Run tests in watch mode
test-watch:
    pnpm --filter sqlts test

# Build the sqlts package
build:
    pnpm --filter sqlts build

# Run tests and build
test-build: test build

# Install dependencies
install:
    pnpm install

# Clean build artifacts
clean:
    rm -rf sqlts/dist

# Run the Rust CLI
cli *ARGS:
    cargo run --bin cli -- {{ARGS}}

# Build the Rust CLI
build-cli:
    cargo build --release --bin cli
