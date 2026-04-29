import axios from 'axios';

async function testCourseApi() {
  try {
    console.log('Testing course API...');
    
    // Get all courses
    const coursesResponse = await axios.get('http://localhost:3000/api/courses');
    console.log(`Found ${coursesResponse.data.courses.length} courses`);
    
    // Test a few courses to see if they have pages
    for (let i = 0; i < Math.min(5, coursesResponse.data.courses.length); i++) {
      const course = coursesResponse.data.courses[i];
      console.log(`Testing course ID: ${course.id}, Title: ${course.title}`);
      
      try {
        // Get specific course with pages
        const courseResponse = await axios.get(`http://localhost:3000/api/courses/${course.id}`);
        console.log('Course details:', {
          id: courseResponse.data.id,
          title: courseResponse.data.title,
          pagesCount: courseResponse.data.pages ? courseResponse.data.pages.length : 0,
          hasPages: !!courseResponse.data.pages
        });
        
        if (courseResponse.data.pages && courseResponse.data.pages.length > 0) {
          console.log('First page sample:', {
            id: courseResponse.data.pages[0].id,
            title: courseResponse.data.pages[0].title,
            type: courseResponse.data.pages[0].type
          });
          break; // Found a course with pages, we can stop testing
        } else {
          console.log('No pages found for this course');
        }
      } catch (err) {
        console.error(`Error fetching course ${course.id}:`, err.message);
      }
    }
  } catch (error) {
    console.error('Error testing API:', error.code, error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testCourseApi();