const test = require('node:test');
const assert = require('node:assert/strict');

test('Valid email should be accepted', () => {
    assert.match(
        'student@example.com',
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    );
});

test('Invalid email should be rejected', () => {
    assert.doesNotMatch(
        'student.example.com',
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    );
});

test('Password should contain at least 6 characters', () => {
    assert.equal('abc123'.length >= 6, true);
    assert.equal('123'.length >= 6, false);
});