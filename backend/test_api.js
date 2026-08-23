const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('--- Starting API Tests ---');

  try {
    // 1. Health Check
    console.log('\n1. Testing Health Check Endpoint:');
    let res = await axios.get(`${BASE_URL}/health`);
    console.log('Status:', res.status, res.data);

    // 2. Post Consistent Events (Format A, B, C)
    console.log('\n2. Testing POST /events (Consistent Group):');
    const consistentEvents = [
      { eventId: "EVT-TEST-001", source: "SOURCE_A", value: 72.4, timestamp: new Date().toISOString() },
      { event_id: "EVT-TEST-001", source_id: "SOURCE_B", reading: 72.5, time: new Date().toISOString() },
      { id: "EVT-TEST-001", source: "SOURCE_C", eventValue: 72.6, timestamp: new Date().toISOString() }
    ];
    res = await axios.post(`${BASE_URL}/events`, consistentEvents);
    console.log('Status:', res.status, res.data.message);

    // Give it a second to run background reconciliation
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Post Conflicting Events
    console.log('\n3. Testing POST /events (Conflicting Group):');
    const conflictingEvents = [
      { eventId: "EVT-TEST-002", source: "SOURCE_A", value: 40.0, timestamp: new Date().toISOString() },
      { eventId: "EVT-TEST-002", source: "SOURCE_B", value: 41.0, timestamp: new Date().toISOString() },
      { eventId: "EVT-TEST-002", source: "SOURCE_C", value: 95.0, timestamp: new Date().toISOString() }
    ];
    res = await axios.post(`${BASE_URL}/events`, conflictingEvents);
    console.log('Status:', res.status, res.data.message);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. Get Event Group
    console.log('\n4. Testing GET /events/:eventId:');
    res = await axios.get(`${BASE_URL}/events/EVT-TEST-002`);
    console.log('Fetched Readings:', res.data.data.length);

    // 5. Get All Reconciliations
    console.log('\n5. Testing GET /reconciliation:');
    res = await axios.get(`${BASE_URL}/reconciliation`);
    console.log('Total Reconciliations found:', res.data.data.length);
    res.data.data.forEach(r => console.log(`- ${r.eventId}: ${r.status}, Trusted Value: ${r.trustedValue}`));

    // 6. Get Alerts
    console.log('\n6. Testing GET /alerts:');
    res = await axios.get(`${BASE_URL}/alerts`);
    console.log('Total Alerts found:', res.data.data.length);
    if (res.data.data.length > 0) {
      console.log(`- Alert for ${res.data.data[0].eventId}: ${res.data.data[0].message}`);
    }

    // 7. Get Audit Logs
    console.log('\n7. Testing GET /audit-logs:');
    res = await axios.get(`${BASE_URL}/audit-logs`);
    console.log('Total Audit Logs found:', res.data.data.length);

    console.log('\n--- All Tests Completed Successfully ---');

  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else {
      console.error('Connection Error:', error.message);
      console.error('\nMake sure your server is running (npm run dev) and MongoDB is connected!');
    }
  }
};

runTests();
