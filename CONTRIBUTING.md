# Contributing to MCP Persistence Server

Thank you for your interest in contributing to the MCP Persistence Server! This document provides guidelines and instructions for contributing.

## 🤝 Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:
- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Respect differing viewpoints and experiences

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x or later
- npm or yarn
- Git
- SQLite3 (for direct database inspection)
- A code editor with TypeScript support

### Setting Up Your Development Environment

1. **Fork the repository**
   ```bash
   # Click the 'Fork' button on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/mcp-persistence-server.git
   cd mcp-persistence-server
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/mcp-persistence-server.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Build the project**
   ```bash
   npm run build
   ```

6. **Run tests**
   ```bash
   npm test
   ```

## 📝 Development Process

### 1. Create a Feature Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create a new feature branch
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Write clean, documented code
- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed

### 3. Code Style Guidelines

- **TypeScript**: Use strict type checking
- **Formatting**: Use 2 spaces for indentation
- **Naming**: Use camelCase for variables, PascalCase for types/classes
- **Comments**: Add JSDoc comments for public APIs
- **Imports**: Group and sort imports logically

Example:
```typescript
/**
 * Saves a message to the conversation history
 * @param message - The message to save
 * @returns The saved message with generated ID
 */
export async function saveMessage(message: MessageInput): Promise<Message> {
  // Implementation
}
```

### 4. Testing

- **Unit Tests**: Test individual functions and classes
- **Integration Tests**: Test component interactions
- **End-to-End Tests**: Test complete workflows

Run tests:
```bash
# All tests
npm test

# Specific test suite
npm run test:unit
npm run test:integration

# With coverage
npm run test:coverage
```

### 5. Commit Your Changes

Follow conventional commit format:
```bash
# Format: <type>(<scope>): <subject>

git commit -m "feat(search): add semantic search capability"
git commit -m "fix(database): resolve migration issue"
git commit -m "docs(readme): update installation instructions"
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Build process or auxiliary tool changes

### 6. Push and Create Pull Request

```bash
# Push your branch
git push origin feature/your-feature-name

# Create PR on GitHub
```

## 🔍 Pull Request Guidelines

### PR Checklist

- [ ] Tests pass (`npm test`)
- [ ] Code follows style guidelines (`npm run lint`)
- [ ] Documentation updated
- [ ] Commits follow conventional format
- [ ] PR description explains changes clearly

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Related Issues
Fixes #123
```

## 🏗️ Architecture Guidelines

### Project Structure

```
src/
├── server/          # MCP server implementation
├── storage/         # Database and repository layer
├── search/          # Search engine components
├── tools/           # MCP tool implementations
├── types/           # TypeScript type definitions
└── utils/           # Utility functions

tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
└── utils/          # Test utilities
```

### Adding New Features

1. **Design First**: Create an issue to discuss the feature
2. **Follow MCP Protocol**: Ensure tools are stateless
3. **Maintain Backward Compatibility**: Don't break existing APIs
4. **Add Tests**: Aim for >80% coverage
5. **Document**: Update relevant documentation

### Database Changes

- Create a new migration in `src/storage/migrations/`
- Include both `up` and `down` migrations
- Test migration thoroughly
- Update schema documentation

## 🧪 Testing Guidelines

### Test Structure

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should handle normal case', async () => {
      // Arrange
      const input = createTestInput();
      
      // Act
      const result = await component.method(input);
      
      // Assert
      expect(result).toEqual(expectedOutput);
    });
    
    it('should handle error case', async () => {
      // Test error scenarios
    });
  });
});
```

### Test Coverage

- Aim for >80% code coverage
- Test edge cases and error conditions
- Mock external dependencies
- Use realistic test data

## 📚 Documentation

### Code Documentation

- Add JSDoc comments to all public APIs
- Include parameter descriptions
- Add usage examples for complex functions
- Document return types and exceptions

### README Updates

Update README.md when:
- Adding new features
- Changing configuration options
- Modifying installation steps
- Adding new dependencies

## 🐛 Reporting Issues

### Before Creating an Issue

1. Check existing issues
2. Verify you're using the latest version
3. Try to reproduce with minimal setup

### Issue Template

```markdown
## Description
Clear description of the issue

## Steps to Reproduce
1. Step one
2. Step two
3. ...

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., macOS 14.0]
- Node.js: [e.g., 20.10.0]
- npm: [e.g., 10.2.0]

## Additional Context
Any other relevant information
```

## 🚀 Release Process

1. **Version Bump**: Update version in package.json
2. **Update CHANGELOG**: Document all changes
3. **Run Tests**: Ensure all tests pass
4. **Build**: Create production build
5. **Tag**: Create git tag for release
6. **Publish**: Publish to npm (maintainers only)

## 📞 Getting Help

- **Discord**: Join our community server
- **GitHub Discussions**: Ask questions
- **Issue Tracker**: Report bugs
- **Email**: maintainers@example.com

## 🙏 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project website

Thank you for contributing to MCP Persistence Server!