// course_list.js

document.addEventListener('DOMContentLoaded', function() {
    // Initialize star ratings display
    initializeStarRatings();
    
    // Setup search and filtering functionality
    setupSearchAndFilters();
    
    // Setup pagination
    setupPagination();
    
    // Initialize interactive elements
    initializeInteractions();
});

// Initialize star ratings with Font Awesome icons
function initializeStarRatings() {
    document.querySelectorAll('.stars').forEach(starsContainer => {
        const rating = parseFloat(starsContainer.getAttribute('data-rating'));
        const stars = Array.from(starsContainer.querySelectorAll('i'));
        
        // Update star icons based on rating
        stars.forEach((star, index) => {
            const position = index + 1;
            
            if (rating >= position) {
                // Full star
                star.className = 'fas fa-star';
            } else if (rating > position - 0.5 && rating < position) {
                // Half star
                star.className = 'fas fa-star-half-alt';
            } else {
                // Empty star
                star.className = 'far fa-star';
            }
        });
    });
}

// Setup search and filtering functionality
function setupSearchAndFilters() {
    const searchInput = document.getElementById('search-input');
    const departmentFilter = document.getElementById('department-filter');
    const yearFilter = document.getElementById('year-filter');
    const semesterFilter = document.getElementById('semester-filter');
    const sortFilter = document.getElementById('sort-filter');
    const courseItems = document.querySelectorAll('.course-item');
    
    // Combined filter function
    function filterCourses() {
        const searchValue = searchInput.value.toLowerCase();
        const departmentValue = departmentFilter.value;
        const yearValue = yearFilter.value;
        const semesterValue = semesterFilter.value;
        
        courseItems.forEach(item => {
            const courseName = item.querySelector('.course-name').textContent.toLowerCase();
            const courseTeacher = item.querySelector('.course-teacher').textContent.toLowerCase();
            const department = item.getAttribute('data-department');
            const year = item.getAttribute('data-year');
            const semester = item.getAttribute('data-semester');
            
            // Check if item matches all active filters
            const matchesSearch = !searchValue || 
                                 courseName.includes(searchValue) || 
                                 courseTeacher.includes(searchValue);
                                 
            const matchesDepartment = !departmentValue || department === departmentValue;
            const matchesYear = !yearValue || year === yearValue;
            const matchesSemester = !semesterValue || semester === semesterValue;
            
            // Show or hide based on filters
            if (matchesSearch && matchesDepartment && matchesYear && matchesSemester) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
        
        // Update visible count
        updateVisibleCount();
    }
    
    // Apply sorting
    function applySorting() {
        const sortValue = sortFilter.value;
        const coursesList = document.querySelector('.courses-container');
        const items = Array.from(courseItems);
        
        // Sort items based on selected criteria
        items.sort((a, b) => {
            if (sortValue === 'rating-desc') {
                const ratingA = parseFloat(a.querySelector('.stars').getAttribute('data-rating'));
                const ratingB = parseFloat(b.querySelector('.stars').getAttribute('data-rating'));
                return ratingB - ratingA;
            } else if (sortValue === 'rating-asc') {
                const ratingA = parseFloat(a.querySelector('.stars').getAttribute('data-rating'));
                const ratingB = parseFloat(b.querySelector('.stars').getAttribute('data-rating'));
                return ratingA - ratingB;
            } else if (sortValue === 'date-desc') {
                const dateA = a.querySelector('.last-date').textContent;
                const dateB = b.querySelector('.last-date').textContent;
                return new Date(dateB.split(': ')[1]) - new Date(dateA.split(': ')[1]);
            } else if (sortValue === 'comment-desc') {
                const countA = parseInt(a.querySelector('.rating-count').textContent.match(/\d+/)[0]);
                const countB = parseInt(b.querySelector('.rating-count').textContent.match(/\d+/)[0]);
                return countB - countA;
            }
            return 0;
        });
        
        // Reorder items in the DOM
        items.forEach(item => {
            coursesList.appendChild(item);
        });
    }
    
    // Update visible course count
    function updateVisibleCount() {
        const visibleCount = Array.from(courseItems).filter(item => item.style.display !== 'none').length;
        const countElement = document.querySelector('.section-title .count');
        if (countElement) {
            countElement.textContent = `(${visibleCount} 門課程)`;
        }
    }
    
    // Add event listeners
    searchInput.addEventListener('input', filterCourses);
    departmentFilter.addEventListener('change', filterCourses);
    yearFilter.addEventListener('change', filterCourses);
    semesterFilter.addEventListener('change', filterCourses);
    sortFilter.addEventListener('change', () => {
        applySorting();
        filterCourses();
    });
    
    // Initial sort
    applySorting();
}

// Setup pagination
function setupPagination() {
    const pageButtons = document.querySelectorAll('.page-btn');
    const nextButton = document.querySelector('.page-next');
    
    // Add click events to page buttons
    pageButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            pageButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            // In a real implementation, this would fetch the next page of results
            // For demo purposes, we'll just scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
    
    // Next button functionality
    if (nextButton) {
        nextButton.addEventListener('click', function() {
            // Find currently active button
            const activeButton = document.querySelector('.page-btn.active');
            if (activeButton) {
                // Get next button
                const nextPageButton = activeButton.nextElementSibling;
                if (nextPageButton && nextPageButton.classList.contains('page-btn')) {
                    // Simulate click on next page button
                    nextPageButton.click();
                }
            }
        });
    }
}

// Initialize other interactive elements
function initializeInteractions() {
    // Animate stats on scroll
    const statItems = document.querySelectorAll('.stat-item');
    
    // Simple animation when stats come into view
    function animateStats() {
        statItems.forEach(item => {
            const position = item.getBoundingClientRect();
            
            // If stat is in viewport
            if (position.top < window.innerHeight && position.bottom >= 0) {
                item.classList.add('animated');
            }
        });
    }
    
    // Add animation class to stats
    statItems.forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        item.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });
    
    // Check initial position and then on scroll
    animateStats();
    window.addEventListener('scroll', animateStats);
    
    // After a slight delay, animate stats
    setTimeout(() => {
        statItems.forEach((item, index) => {
            setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }, 300);
}