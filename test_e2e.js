const API_URL = 'http://127.0.0.1:5000/api';

async function req(path, method = 'GET', data = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (data) options.body = JSON.stringify(data);

  const res = await fetch(`${API_URL}${path}`, options);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = text;
  }

  if (!res.ok) {
    const error = new Error(`Request failed: ${res.status} ${res.statusText}`);
    error.data = json;
    error.status = res.status;
    throw error;
  }
  return json;
}

async function runTests() {
  console.log('=== Starting Hostel Management System E2E Automated Tests ===\n');

  try {
    // 1. Health Check
    const health = await req('');
    console.log('✔ Health Check:', health.message);

    // 2. Admin Login
    console.log('\n--- Test 1: Admin Login ---');
    const adminLogin = await req('/auth/login', 'POST', {
      email: 'admin@hostel.com',
      password: 'admin123'
    });
    const adminToken = adminLogin.token;
    console.log('✔ Admin logged in successfully. Token received.');

    // 3. Get Dashboard Stats
    console.log('\n--- Test 2: Admin Dashboard Stats ---');
    const stats = await req('/rooms/dashboard/stats', 'GET', null, adminToken);
    console.log('✔ Stats:', stats);

    // 4. Create a Room
    console.log('\n--- Test 3: Create Room ---');
    const newRoomNum = '301-' + Date.now().toString().slice(-4);
    const roomRes = await req(
      '/rooms',
      'POST',
      {
        roomNumber: newRoomNum,
        block: 'C Block',
        floor: 3,
        capacity: 2
      },
      adminToken
    );
    const createdRoomId = roomRes.room._id;
    console.log(`✔ Room ${newRoomNum} created. ID:`, createdRoomId);

    // 5. Register Student
    console.log('\n--- Test 4: Student Self-Registration ---');
    const studentEmail = `student_${Date.now()}@college.edu`;
    const studentReg = await req('/auth/register', 'POST', {
      name: 'Ananya Roy',
      email: studentEmail,
      password: 'password123',
      phone: '9876509876',
      department: 'Computer Science',
      year: '2nd Year',
      gender: 'Female'
    });
    const studentId = studentReg._id;
    const studentToken = studentReg.token;
    console.log(`✔ Student ${studentEmail} registered. Token received.`);

    // 6. Admin assigns Student to Room
    console.log('\n--- Test 5: Assign Student to Room & Sync Occupancy ---');
    const assignRes = await req(
      `/students/${studentId}`,
      'PUT',
      {
        room: createdRoomId
      },
      adminToken
    );
    console.log('✔ Student assigned to room:', assignRes.student.room.roomNumber);

    // Verify room occupancy updated
    const roomCheck = await req(`/rooms/${createdRoomId}`, 'GET', null, adminToken);
    console.log(`✔ Room occupants count: ${roomCheck.room.occupiedBeds}/${roomCheck.room.capacity}, status: ${roomCheck.room.status}`);
    if (roomCheck.room.occupiedBeds !== 1) {
      throw new Error('Occupancy sync failed!');
    }

    // 7. Student Submits Complaint
    console.log('\n--- Test 6: Student Submits Complaint ---');
    const complaintRes = await req(
      '/complaints',
      'POST',
      {
        title: 'Water tap leaking in washroom',
        description: 'The tap on the 3rd floor west washroom has been leaking continuously since yesterday.'
      },
      studentToken
    );
    const complaintId = complaintRes.complaint._id;
    console.log('✔ Complaint created with ID:', complaintId);

    // 8. Student Views their complaints
    console.log('\n--- Test 7: Student Views Own Complaints ---');
    const myComplaints = await req('/complaints', 'GET', null, studentToken);
    console.log(`✔ Student has ${myComplaints.length} complaints.`);

    // 9. Admin Views and Updates Complaint Status
    console.log('\n--- Test 8: Admin Updates Complaint Status to In Progress & Resolved ---');
    await req(
      `/complaints/${complaintId}`,
      'PUT',
      { status: 'In Progress' },
      adminToken
    );
    console.log('✔ Status updated to "In Progress"');

    await req(
      `/complaints/${complaintId}`,
      'PUT',
      { status: 'Resolved' },
      adminToken
    );
    console.log('✔ Status updated to "Resolved"');

    // 10. Admin Search Students
    console.log('\n--- Test 9: Admin Search Students ---');
    const searchRes = await req('/students?search=Ananya', 'GET', null, adminToken);
    console.log(`✔ Search "Ananya" returned ${searchRes.length} match:`, searchRes[0]?.name);

    // 11. Delete Student & Verify Room Occupancy Decrements
    console.log('\n--- Test 10: Delete Student & Verify Occupancy Decrement ---');
    await req(`/students/${studentId}`, 'DELETE', null, adminToken);
    console.log('✔ Student deleted.');

    const roomCheckAfterDelete = await req(`/rooms/${createdRoomId}`, 'GET', null, adminToken);
    console.log(`✔ Room occupants count after delete: ${roomCheckAfterDelete.room.occupiedBeds}/${roomCheckAfterDelete.room.capacity}`);
    if (roomCheckAfterDelete.room.occupiedBeds !== 0) {
      throw new Error('Occupancy decrement sync failed!');
    }

    // 12. Delete Test Room
    console.log('\n--- Test 11: Delete Test Room ---');
    await req(`/rooms/${createdRoomId}`, 'DELETE', null, adminToken);
    console.log('✔ Test room deleted.');

    console.log('\n========================================');
    console.log('🎉 ALL 11 TEST CASES PASSED SUCCESSFULLY!');
    console.log('========================================\n');
  } catch (err) {
    console.error('❌ Test failed:', err.status, err.data || err.message);
    process.exit(1);
  }
}

runTests();
