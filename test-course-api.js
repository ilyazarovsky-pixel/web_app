const axios = require('axios');

async function testCourseApi() {
  try {
    console.log('Testing course API...');
    
    // Get all courses
    const coursesResponse = await axios.get('http://localhost:3000/api/courses');
    console.log(`Found ${coursesResponse.data.courses.length} courses`);
    
    if (coursesResponse.data.courses.length > 0) {
      const courseId = coursesResponse.data.courses[0].id;
      console.log(`Testing course ID: ${courseId}`);
      
      // Get specific course with pages
      const courseResponse = await axios.get(`http://localhost:3000/api/courses/${courseId}`);
      console.log('Course details:', {
        id: courseResponse.data.id,
        title: courseResponse.data.title,
        pagesCount: courseResponse.data.pages ? courseResponse.data.pages.length : 0,
        hasPages: !!courseResponse.data.pages
      });
      
      if (courseResponse.data.pages) {
        console.log('Sample page:', courseResponse.data.pages[0]);
      } else {
        console.log('No pages property found in course response');
      }
    }
  } catch (error) {
    console.error('Error testing API:', error.response?.data || error.message);
  }
}

testCourseApi();