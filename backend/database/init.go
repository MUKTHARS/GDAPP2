package database

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"golang.org/x/crypto/bcrypt"
)

func InitDB(db *sql.DB) error {
    // Create tables if not exists (with IF NOT EXISTS)
    createTables := []string{
        // Admin tables
        `CREATE TABLE IF NOT EXISTS admin_users (
            id VARCHAR(36) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        // Staff tables
        `CREATE TABLE IF NOT EXISTS staff_users (
            id VARCHAR(36) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            admin_id VARCHAR(36),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
        )`,

         // Venue tables
        `CREATE TABLE IF NOT EXISTS venues (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(50) NOT NULL,
            capacity INT DEFAULT 10,
            level INT DEFAULT '0',
            qr_secret VARCHAR(255) NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            session_timing VARCHAR(50) NOT NULL,
            available_days VARCHAR(50),
            start_time TIME,
            end_time TIME,
            table_details VARCHAR(50) NOT NULL,
            created_by VARCHAR(36),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
        )`,

                `CREATE TABLE IF NOT EXISTS gd_sessions (
            id VARCHAR(36) PRIMARY KEY,
            topic TEXT NOT NULL,
            venue_id VARCHAR(36),
            level INT NOT NULL,
            start_time TIMESTAMP NOT NULL,
             qr_group_id VARCHAR(36) NULL,
            end_time DATETIME NOT NULL,
            agenda JSON DEFAULT (JSON_OBJECT()),
            survey_weights JSON DEFAULT (JSON_OBJECT()),
            max_capacity INT DEFAULT 10,
            status ENUM('pending','active','completed','cancelled') DEFAULT 'pending',
            created_by VARCHAR(36),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
        )`,

        // Student tables
        `CREATE TABLE IF NOT EXISTS student_users (
            id VARCHAR(36) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(100) NOT NULL,
            department VARCHAR(50) NOT NULL,
            year INT NOT NULL,
            roll_number VARCHAR(50) NULL,
            photo_url VARCHAR(255),
            current_booking VARCHAR(36) NULL,
            current_gd_level INT DEFAULT 1,
            is_active BOOLEAN DEFAULT TRUE,
            level_marks JSON DEFAULT NULL,
            level_ranks JSON DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY  (current_booking) REFERENCES gd_sessions(id) ON DELETE SET NULL
        )`,

       `CREATE TABLE IF NOT EXISTS session_ready_status (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    is_ready BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_session_student (session_id, student_id),
    FOREIGN KEY (session_id) REFERENCES gd_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES student_users(id) ON DELETE CASCADE
);`,

        // Session tables


        // Participant tables
        `CREATE TABLE IF NOT EXISTS session_participants (
            id VARCHAR(36) ,
            session_id VARCHAR(36),
            student_id VARCHAR(36),
            is_dummy BOOLEAN DEFAULT FALSE,
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP NULL DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (session_id, student_id),
            FOREIGN KEY (session_id) REFERENCES gd_sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES student_users(id) ON DELETE CASCADE
        )`,

`CREATE TABLE IF NOT EXISTS student_promotions (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    session_id VARCHAR(36) NOT NULL,
    old_level INT NOT NULL,
    new_level INT NOT NULL,
    rankings INT NOT NULL,
    promoted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_promotion (student_id, session_id),
    FOREIGN KEY (student_id) REFERENCES student_users(id),
    FOREIGN KEY (session_id) REFERENCES gd_sessions(id)
)`,


        // Survey tables
        `CREATE TABLE IF NOT EXISTS survey_responses (
            id VARCHAR(36) PRIMARY KEY,
            session_id VARCHAR(36),
            responder_id VARCHAR(36),
            question_number INT NOT NULL,
            first_place VARCHAR(36),
            second_place VARCHAR(36),
            third_place VARCHAR(36),
            question_text VARCHAR(255),
            weight DECIMAL(3,2),
            applicable_levels JSON,
           
    penalty_points INT DEFAULT 0,
    is_biased BOOLEAN DEFAULT FALSE,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES gd_sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (responder_id) REFERENCES student_users(id) ON DELETE CASCADE,
            FOREIGN KEY (first_place) REFERENCES student_users(id) ON DELETE SET NULL,
            FOREIGN KEY (second_place) REFERENCES student_users(id) ON DELETE SET NULL,
            FOREIGN KEY (third_place) REFERENCES student_users(id) ON DELETE SET NULL
        )`,

        
        `CREATE TABLE IF NOT EXISTS gd_rules (
         level INT PRIMARY KEY,
        prep_time INT NOT NULL,
        discussion_time INT NOT NULL,
        penalty_threshold DECIMAL(3,1) NOT NULL,
        allow_override BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,



`CREATE TABLE IF NOT EXISTS gd_topics (
    id VARCHAR(36) PRIMARY KEY,
    level INT NOT NULL,
    topic_text TEXT NOT NULL,
    prep_materials JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_level_topic (level, topic_text(255))
)`,

`CREATE TABLE IF NOT EXISTS session_phase_tracking (
    session_id VARCHAR(36),
    student_id VARCHAR(36),
    phase ENUM('prep', 'discussion', 'survey') NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id, student_id, phase),
    FOREIGN KEY (session_id) REFERENCES gd_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES student_users(id) ON DELETE CASCADE
)`,

`CREATE TABLE IF NOT EXISTS ranking_points_config (
    id VARCHAR(36) PRIMARY KEY,
    first_place_points DECIMAL(3,1) DEFAULT 4.0,
    second_place_points DECIMAL(3,1) DEFAULT 3.0,
    third_place_points DECIMAL(3,1) DEFAULT 2.0,
    level INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_level_config (level)
);`,

`CREATE TABLE IF NOT EXISTS survey_results (
     id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,  
    responder_id VARCHAR(36) NOT NULL, 
    question_id VARCHAR(36) NOT NULL,
    ranks INT NOT NULL,  
    score DECIMAL(5,2) NOT NULL,         
    weighted_score DECIMAL(5,2) NOT NULL,
    penalty_points DECIMAL(3,1) DEFAULT 0.0,
    is_biased BOOLEAN DEFAULT FALSE,
    is_current_session TINYINT(1) DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    expected_ranks JSON DEFAULT NULL,
    average_score DECIMAL(5,2) DEFAULT 0.0,
     median_score DECIMAL(5,2) DEFAULT 0.00,
deviation DECIMAL(5,2) DEFAULT 0.0,
penalty_calculated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
/**    Dont remove this ----- >
 CREATE INDEX IF NOT EXISTS idx_survey_results_session_completed ON survey_results (session_id, is_completed) 
CREATE INDEX IF NOT EXISTS idx_survey_completion_session ON survey_completion (session_id);
CREATE INDEX IF NOT EXISTS idx_survey_results_session_student ON survey_results (session_id, student_id);
CREATE INDEX IF NOT EXISTS idx_survey_results_session_responder ON survey_results (session_id, responder_id);
CREATE INDEX IF NOT EXISTS idx_survey_penalties_session_student ON survey_penalties (session_id, student_id);

CREATE INDEX IF NOT EXISTS idx_survey_results_session_question ON survey_results (session_id, question_id);
CREATE INDEX IF NOT EXISTS idx_survey_penalties_session_student ON survey_penalties (session_id, student_id);
CREATE INDEX IF NOT EXISTS idx_survey_results_session_ranks ON survey_results (session_id, ranks);


if above shows error try the below straightly

INDEX idx_survey_results_session_completed (session_id, is_completed),
    INDEX idx_survey_results_session_student (session_id, student_id),
    INDEX idx_survey_results_session_responder (session_id, responder_id),
    INDEX idx_survey_results_session_question (session_id, question_id),
    INDEX idx_survey_results_session_ranks (session_id, ranks)
);

**/
     FOREIGN KEY (session_id) REFERENCES gd_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES student_users(id) ON DELETE CASCADE,
    FOREIGN KEY (responder_id) REFERENCES student_users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_response (session_id, responder_id, question_id, ranks)   


    )`,

`CREATE TABLE IF NOT EXISTS survey_completion_permanent (
    session_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id, student_id),
    FOREIGN KEY (session_id) REFERENCES gd_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES student_users(id) ON DELETE CASCADE
)`,

`CREATE TABLE IF NOT EXISTS survey_results_permanent (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,  
    responder_id VARCHAR(36) NOT NULL, 
    question_id VARCHAR(36) NOT NULL,
    ranks INT NOT NULL,  
    score DECIMAL(5,2) NOT NULL,         
    weighted_score DECIMAL(5,2) NOT NULL,
    penalty_points DECIMAL(3,1) DEFAULT 0.0,
    is_biased BOOLEAN DEFAULT FALSE,
    is_current_session TINYINT(1) DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    expected_ranks JSON DEFAULT NULL,
    average_score DECIMAL(5,2) DEFAULT 0.0,
    deviation DECIMAL(5,2) DEFAULT 0.0,
    penalty_calculated BOOLEAN DEFAULT FALSE,
   
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES gd_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES student_users(id) ON DELETE CASCADE,
    FOREIGN KEY (responder_id) REFERENCES student_users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_response_permanent (session_id, responder_id, question_id, ranks)
)`,


`CREATE TRIGGER IF NOT EXISTS after_survey_completion_insert
AFTER INSERT ON survey_completion
FOR EACH ROW
INSERT IGNORE INTO survey_completion_permanent 
(session_id, student_id, completed_at)
VALUES (NEW.session_id, NEW.student_id, NEW.completed_at)`,

`CREATE TRIGGER IF NOT EXISTS after_survey_results_insert
AFTER INSERT ON survey_results
FOR EACH ROW
INSERT IGNORE INTO survey_results_permanent 
(id, session_id, student_id, responder_id, question_id, ranks, score, 
 weighted_score, penalty_points, is_biased, is_current_session, 
 is_completed, expected_ranks, average_score, deviation, 
 penalty_calculated, created_at)
VALUES (NEW.id, NEW.session_id, NEW.student_id, NEW.responder_id, 
        NEW.question_id, NEW.ranks, NEW.score, NEW.weighted_score, 
        NEW.penalty_points, NEW.is_biased, NEW.is_current_session, 
        NEW.is_completed, NEW.expected_ranks, NEW.average_score, 
        NEW.deviation, NEW.penalty_calculated,  NEW.created_at)`,

`CREATE TRIGGER IF NOT EXISTS after_survey_results_update
AFTER UPDATE ON survey_results
FOR EACH ROW
UPDATE survey_results_permanent 
SET 
    score = NEW.score,
    weighted_score = NEW.weighted_score,
    penalty_points = NEW.penalty_points,
    is_biased = NEW.is_biased,
    is_current_session = NEW.is_current_session,
    is_completed = NEW.is_completed,
    average_score = NEW.average_score,
    deviation = NEW.deviation,
    penalty_calculated = NEW.penalty_calculated
  
WHERE id = NEW.id`,
    
`CREATE TABLE IF NOT EXISTS venue_qr_codes (
    id VARCHAR(36) PRIMARY KEY,
    venue_id VARCHAR(36) NOT NULL,
    qr_data VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    max_capacity INT DEFAULT 15,
    current_usage INT DEFAULT 0,
    qr_group_id VARCHAR(36) NULL,
    created_by VARCHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   /** CREATE INDEX IF NOT EXISTS idx_venue_qr_group ON venue_qr_codes (venue_id, qr_group_id);**/
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
)`,

`CREATE TABLE IF NOT EXISTS consensus_rankings (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    consensus_rank INT NOT NULL,
    total_votes INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES gd_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES student_users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_session_student (session_id, student_id)
);`,

`CREATE TABLE IF NOT EXISTS question_timers (
    session_id VARCHAR(36),
    question_id INT,
    end_time DATETIME NOT NULL,
    PRIMARY KEY (session_id, question_id),
    FOREIGN KEY (session_id) REFERENCES gd_sessions(id) ON DELETE CASCADE
)`,


`CREATE TABLE IF NOT EXISTS survey_questions (
    id VARCHAR(36) PRIMARY KEY,
    question_text TEXT NOT NULL,
    weight DECIMAL(3,1) DEFAULT 1.0,
    is_active BOOLEAN DEFAULT TRUE,
    level INT DEFAULT 1 ,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`,


`CREATE TABLE IF NOT EXISTS question_levels (
    question_id VARCHAR(36),
    level INT,
    PRIMARY KEY (question_id, level),
    FOREIGN KEY (question_id) REFERENCES survey_questions(id) ON DELETE CASCADE
)`,


`CREATE TABLE IF NOT EXISTS survey_penalties (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  student_id VARCHAR(36) NOT NULL,
  penalty_points DECIMAL(5,2) NOT NULL,
  question_id INT NOT NULL,
  is_biased BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES gd_sessions(id),
  FOREIGN KEY (student_id) REFERENCES student_users(id),
  UNIQUE KEY (session_id, student_id, question_id)
);`,

`CREATE TABLE IF NOT EXISTS survey_completion (
    session_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id, student_id),
    FOREIGN KEY (session_id) REFERENCES gd_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES student_users(id) ON DELETE CASCADE
);`,

`CREATE TABLE IF NOT EXISTS survey_timing (
    session_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    duration_seconds INT NOT NULL,
    PRIMARY KEY (session_id, student_id),
    FOREIGN KEY (session_id) REFERENCES gd_sessions(id),
    FOREIGN KEY (student_id) REFERENCES student_users(id)
);`,
`CREATE TABLE IF NOT EXISTS session_feedback (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES gd_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES student_users(id) ON DELETE CASCADE,
    UNIQUE KEY (session_id, student_id)
)`,


    }

    for _, query := range createTables {
        if _, err := db.Exec(query); err != nil {
            return fmt.Errorf("error creating tables: %v", err)
        }
    }

    // Insert sample data with IGNORE to skip existing records
    sampleData := []string{
        // Admin user
        // `INSERT IGNORE INTO admin_users (id, email, password_hash) VALUES 
        // ('admin1', 'admin@example.com', '$2a$10$xJwL5v5Jz5TZfN5D5M7zOeJz5TZfN5D5M7zOeJz5TZfN5D5M7zOe')`,

        // Staff user
        `INSERT IGNORE INTO staff_users (id, email, password_hash, admin_id) VALUES 
        ('staff1', 'staff@example.com', '$2a$10$xJwL5v5Jz5TZfN5D5M7zOeJz5TZfN5D5M7zOeJz5TZfN5D5M7zOe', 'admin1')`,

        // Students
`INSERT IGNORE INTO student_users (id, email, password_hash, full_name, department, year, is_active) VALUES 
('student1', 'student1@example.com', '$2a$10$xJwL5v5Jz5TZfN5D5M7zOeJz5TZfN5D5M7zOeJz5TZfN5D5M7zOe', 'John Doe', 'CS', 3, TRUE),
('student2', 'student2@example.com', '$2a$10$xJwL5v5Jz5TZfN5D5M7zOeJz5TZfN5D5M7zOeJz5TZfN5D5M7zOe', 'Jane Smith', 'ECE', 2, TRUE)
`,
    
    }

    for _, query := range sampleData {
        if _, err := db.Exec(query); err != nil {
            log.Printf("Warning: inserting sample data: %v (this might be expected if data already exists)", err)
        }
    }
adminPassword := "admin123" 
hashedPassword, err := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
if err != nil {
    return fmt.Errorf("error hashing password: %v", err)
}

_, err = db.Exec(
    `INSERT IGNORE INTO admin_users (id, email, password_hash) VALUES 
    ('admin1', 'admin@example.com', ?)`,
    string(hashedPassword),
)
if err != nil {
    log.Printf("Warning: inserting admin user: %v", err)
}

hashedStudentPassword, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
if err != nil {
    log.Printf("Error hashing password: %v", err)
    // return
}

_, err = db.Exec(
    `INSERT INTO student_users 
    (id, email, password_hash, full_name, department, year, is_active) 
    VALUES (?, ?, ?, ?, ?, ?, ?) 
    ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    "student1",
    "student1@example.com",
    string(hashedStudentPassword),
    "Test Student",
    "CS",
    3,
    true,
)
if err != nil {
    log.Printf("Error inserting test student: %v", err)
}

 go func() {
        for {
            time.Sleep(30 * time.Minute) // Run every 30 minutes
            _, err := db.Exec(`
                DELETE FROM session_phase_tracking 
                WHERE start_time < DATE_SUB(NOW(), INTERVAL 30 MINUTE)`)
            if err != nil {
                log.Printf("Error cleaning up phase tracking: %v", err)
            }
        }
    }()

    return nil
}

