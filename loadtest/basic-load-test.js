// Basic load test script for LearnHub
// Uses autocannon to perform simple load testing

const autocannon = require('autocannon');

// Run the load test
async function runLoadTest() {
  console.log('Starting LearnHub load test...\n');
  
  const result = await autocannon({
    url: 'http://localhost:3000',
    connections: 10,        // Concurrent connections
    duration: 30,           // Duration in seconds
    requests: [
      { method: 'GET', path: '/' },
      { method: 'GET', path: '/api/courses' },
      { method: 'GET', path: '/health' },
      { method: 'GET', path: '/api/categories' }
    ]
  });

  // Output the results
  console.log('Load Test Results:');
  console.log(`Requests per second: ${result.requests.average}`);
  console.log(`Latency average: ${result.latency.average} ms`);
  console.log(`90th percentile latency: ${result.latency.p90} ms`);
  console.log(`99th percentile latency: ${result.latency.p99} ms`);
  console.log(`Total requests: ${result.totalRequests}`);
  console.log(`Errors: ${result.errors}`);
}

// Execute the test
runLoadTest().catch(error => {
  console.error('Load test failed:', error);
  process.exit(1);
});