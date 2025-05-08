
-- 使用者表
CREATE TABLE User (
    user_id INT PRIMARY KEY,
    student_id VARCHAR(50),
    password VARCHAR(255),
    name VARCHAR(100),
    role ENUM('user', 'admin')
);

-- 課程表
CREATE TABLE Course (
    course_id INT PRIMARY KEY,
    name VARCHAR(100),
    teacher_name VARCHAR(100)
);

-- 課程評論
CREATE TABLE CourseReview (
    review_id INT PRIMARY KEY,
    user_id INT,
    course_id INT,
    content TEXT,
    created_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES User(user_id),
    FOREIGN KEY (course_id) REFERENCES Course(course_id)
);

-- 優化評論
CREATE TABLE OptimizedReview (
    optimized_id INT PRIMARY KEY,
    review_id INT,
    content TEXT,
    FOREIGN KEY (review_id) REFERENCES CourseReview(review_id)
);

-- AI 情緒分析
CREATE TABLE SentimentAnalysis (
    analysis_id INT PRIMARY KEY,
    review_id INT,
    sentiment ENUM('positive', 'negative'),
    keywords TEXT,
    FOREIGN KEY (review_id) REFERENCES CourseReview(review_id)
);

-- 儀表板
CREATE TABLE Dashboard (
    dashboard_id INT PRIMARY KEY,
    user_id INT,
    tasks TEXT,
    credits INT,
    FOREIGN KEY (user_id) REFERENCES User(user_id)
);

-- 查詢紀錄
CREATE TABLE RAGQueryHistory (
    query_id INT PRIMARY KEY,
    user_id INT,
    query_text TEXT,
    result_text TEXT,
    timestamp DATETIME,
    FOREIGN KEY (user_id) REFERENCES User(user_id)
);

-- 法規知識庫
CREATE TABLE LawKnowledgeBase (
    law_id INT PRIMARY KEY,
    title VARCHAR(255),
    content TEXT,
    embedding VECTOR
);

-- 二手書
CREATE TABLE UsedBook (
    book_id INT PRIMARY KEY,
    user_id INT,
    title VARCHAR(255),
    price DECIMAL(10,2),
    category_id INT,
    status ENUM('available', 'sold'),
    FOREIGN KEY (user_id) REFERENCES User(user_id),
    FOREIGN KEY (category_id) REFERENCES UsedBookCategory(category_id)
);

-- 二手書分類
CREATE TABLE UsedBookCategory (
    category_id INT PRIMARY KEY,
    name VARCHAR(100)
);

-- 揪團活動
CREATE TABLE GroupActivity (
    activity_id INT PRIMARY KEY,
    user_id INT,
    title VARCHAR(255),
    description TEXT,
    FOREIGN KEY (user_id) REFERENCES User(user_id)
);

-- 揪團留言
CREATE TABLE GroupMessage (
    message_id INT PRIMARY KEY,
    activity_id INT,
    user_id INT,
    content TEXT,
    timestamp DATETIME,
    FOREIGN KEY (activity_id) REFERENCES GroupActivity(activity_id),
    FOREIGN KEY (user_id) REFERENCES User(user_id)
);
