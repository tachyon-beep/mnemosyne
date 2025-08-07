/**
 * Enhanced Validation Demo
 * 
 * Demonstrates the comprehensive input validation improvements
 */

const { 
  validateDateRange, 
  validateConversationId,
  validateConversationIds,
  validatePagination,
  validateFrequency,
  validateStringArray,
  validateGranularity,
  ValidationError,
  formatValidationError,
  withEnhancedValidation 
} = require('./dist/utils/validation.js');

console.log('🔍 Enhanced Input Validation Demo\n');

// Demo 1: Date Range Validation
console.log('📅 Date Range Validation:');
try {
  const validRange = validateDateRange('2024-01-01T00:00:00.000Z', '2024-01-31T23:59:59.999Z');
  console.log('✅ Valid range:', new Date(validRange.start).toISOString(), 'to', new Date(validRange.end).toISOString());
} catch (error) {
  console.log('❌ Error:', error.userMessage);
}

try {
  // This will fail - start after end
  validateDateRange('2024-02-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');
} catch (error) {
  console.log('❌ Expected error:', error.userMessage);
  console.log('💡 Suggestions:', error.suggestions);
}

// Demo 2: Conversation ID Validation  
console.log('\n🆔 Conversation ID Validation:');
try {
  const validId = validateConversationId('123e4567-e89b-12d3-a456-426614174000');
  console.log('✅ Valid UUID:', validId);
  
  const validSecureId = validateConversationId('secure-id-123456789');
  console.log('✅ Valid secure ID:', validSecureId);
} catch (error) {
  console.log('❌ Error:', error.userMessage);
}

try {
  // This will fail - too short
  validateConversationId('short');
} catch (error) {
  console.log('❌ Expected error:', error.userMessage);
  console.log('💡 Suggestions:', error.suggestions);
}

// Demo 3: Array Validation
console.log('\n📋 Array Validation:');
try {
  const validIds = validateConversationIds([
    '123e4567-e89b-12d3-a456-426614174000',
    'secure-id-123456789',
    'another-valid-id-12345'
  ]);
  console.log('✅ Valid ID array:', validIds);
} catch (error) {
  console.log('❌ Error:', error.userMessage);
}

try {
  // This will fail - duplicates
  validateConversationIds([
    'duplicate-id-123456789',
    'different-id-123456789', 
    'duplicate-id-123456789'
  ]);
} catch (error) {
  console.log('❌ Expected error:', error.userMessage);
  console.log('💡 Suggestions:', error.suggestions);
}

// Demo 4: Business Logic Validation
console.log('\n⚙️ Business Logic Validation:');

// Granularity auto-selection
console.log('📊 Granularity auto-selection:');
console.log('  1 day range → granularity:', validateGranularity(undefined, 1));
console.log(' 15 day range → granularity:', validateGranularity(undefined, 15));
console.log(' 60 day range → granularity:', validateGranularity(undefined, 60));
console.log('120 day range → granularity:', validateGranularity(undefined, 120));

// Resource protection
console.log('\n🛡️ Resource Protection:');
try {
  validatePagination(10, 20);
  console.log('✅ Valid pagination: limit=10, offset=20');
} catch (error) {
  console.log('❌ Error:', error.userMessage);
}

try {
  // This will fail - limit too large
  validatePagination(5000, 0);
} catch (error) {
  console.log('❌ Expected error:', error.userMessage);
  console.log('💡 Suggestions:', error.suggestions);
}

// Demo 5: Enhanced Error Handling
console.log('\n🚨 Enhanced Error Handling:');
try {
  withEnhancedValidation(() => {
    // This will fail with a comprehensive error
    const invalidRange = validateDateRange('2023-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z', '', { maxDays: 365 });
    return invalidRange;
  }, 'demo validation');
} catch (error) {
  const formatted = formatValidationError(error);
  console.log('📋 Structured error response:');
  console.log(JSON.stringify(formatted, null, 2));
}

console.log('\n✨ Enhanced validation provides:');
console.log('  • Comprehensive business rule validation');
console.log('  • Resource protection limits');
console.log('  • User-friendly error messages');
console.log('  • Actionable suggestions');
console.log('  • Production-ready reliability');
console.log('\n🎉 Validation enhancement complete!');