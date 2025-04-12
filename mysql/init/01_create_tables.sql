-- 데이터베이스 생성 및 선택
CREATE DATABASE IF NOT EXISTS excel_test;
USE excel_test;

-- 모든 데이터를 저장할 단일 테이블 (61열: id + 60개 데이터 열)
CREATE TABLE excel_full (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col1 TEXT,
    col2 TEXT,
    col3 TEXT,
    col4 TEXT,
    col5 TEXT,
    col6 TEXT,
    col7 TEXT,
    col8 TEXT,
    col9 TEXT,
    col10 TEXT,
    col11 TEXT,
    col12 TEXT,
    col13 TEXT,
    col14 TEXT,
    col15 TEXT,
    col16 TEXT,
    col17 TEXT,
    col18 TEXT,
    col19 TEXT,
    col20 TEXT,
    col21 TEXT,
    col22 TEXT,
    col23 TEXT,
    col24 TEXT,
    col25 TEXT,
    col26 TEXT,
    col27 TEXT,
    col28 TEXT,
    col29 TEXT,
    col30 TEXT,
    col31 TEXT,
    col32 TEXT,
    col33 TEXT,
    col34 TEXT,
    col35 TEXT,
    col36 TEXT,
    col37 TEXT,
    col38 TEXT,
    col39 TEXT,
    col40 TEXT,
    col41 TEXT,
    col42 TEXT,
    col43 TEXT,
    col44 TEXT,
    col45 TEXT,
    col46 TEXT,
    col47 TEXT,
    col48 TEXT,
    col49 TEXT,
    col50 TEXT,
    col51 TEXT,
    col52 TEXT,
    col53 TEXT,
    col54 TEXT,
    col55 TEXT,
    col56 TEXT,
    col57 TEXT,
    col58 TEXT,
    col59 TEXT,
    col60 TEXT
);

-- 마스터 테이블 (중앙 ID 관리용)
CREATE TABLE excel_master (
    id INT AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2개 열씩 저장할 30개의 분할 테이블
-- 테이블 1: 열 1-2
CREATE TABLE excel_part1 (
    master_id INT NOT NULL PRIMARY KEY,
    col1 TEXT,
    col2 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 2: 열 3-4
CREATE TABLE excel_part2 (
    master_id INT NOT NULL PRIMARY KEY,
    col3 TEXT,
    col4 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 3: 열 5-6
CREATE TABLE excel_part3 (
    master_id INT NOT NULL PRIMARY KEY,
    col5 TEXT,
    col6 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 4: 열 7-8
CREATE TABLE excel_part4 (
    master_id INT NOT NULL PRIMARY KEY,
    col7 TEXT,
    col8 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 5: 열 9-10
CREATE TABLE excel_part5 (
    master_id INT NOT NULL PRIMARY KEY,
    col9 TEXT,
    col10 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 6: 열 11-12
CREATE TABLE excel_part6 (
    master_id INT NOT NULL PRIMARY KEY,
    col11 TEXT,
    col12 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 7: 열 13-14
CREATE TABLE excel_part7 (
    master_id INT NOT NULL PRIMARY KEY,
    col13 TEXT,
    col14 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 8: 열 15-16
CREATE TABLE excel_part8 (
    master_id INT NOT NULL PRIMARY KEY,
    col15 TEXT,
    col16 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 9: 열 17-18
CREATE TABLE excel_part9 (
    master_id INT NOT NULL PRIMARY KEY,
    col17 TEXT,
    col18 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 10: 열 19-20
CREATE TABLE excel_part10 (
    master_id INT NOT NULL PRIMARY KEY,
    col19 TEXT,
    col20 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 11: 열 21-22
CREATE TABLE excel_part11 (
    master_id INT NOT NULL PRIMARY KEY,
    col21 TEXT,
    col22 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 12: 열 23-24
CREATE TABLE excel_part12 (
    master_id INT NOT NULL PRIMARY KEY,
    col23 TEXT,
    col24 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 13: 열 25-26
CREATE TABLE excel_part13 (
    master_id INT NOT NULL PRIMARY KEY,
    col25 TEXT,
    col26 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 14: 열 27-28
CREATE TABLE excel_part14 (
    master_id INT NOT NULL PRIMARY KEY,
    col27 TEXT,
    col28 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 15: 열 29-30
CREATE TABLE excel_part15 (
    master_id INT NOT NULL PRIMARY KEY,
    col29 TEXT,
    col30 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 16: 열 31-32
CREATE TABLE excel_part16 (
    master_id INT NOT NULL PRIMARY KEY,
    col31 TEXT,
    col32 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 17: 열 33-34
CREATE TABLE excel_part17 (
    master_id INT NOT NULL PRIMARY KEY,
    col33 TEXT,
    col34 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 18: 열 35-36
CREATE TABLE excel_part18 (
    master_id INT NOT NULL PRIMARY KEY,
    col35 TEXT,
    col36 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 19: 열 37-38
CREATE TABLE excel_part19 (
    master_id INT NOT NULL PRIMARY KEY,
    col37 TEXT,
    col38 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 20: 열 39-40
CREATE TABLE excel_part20 (
    master_id INT NOT NULL PRIMARY KEY,
    col39 TEXT,
    col40 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 21: 열 41-42
CREATE TABLE excel_part21 (
    master_id INT NOT NULL PRIMARY KEY,
    col41 TEXT,
    col42 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 22: 열 43-44
CREATE TABLE excel_part22 (
    master_id INT NOT NULL PRIMARY KEY,
    col43 TEXT,
    col44 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 23: 열 45-46
CREATE TABLE excel_part23 (
    master_id INT NOT NULL PRIMARY KEY,
    col45 TEXT,
    col46 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 24: 열 47-48
CREATE TABLE excel_part24 (
    master_id INT NOT NULL PRIMARY KEY,
    col47 TEXT,
    col48 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 25: 열 49-50
CREATE TABLE excel_part25 (
    master_id INT NOT NULL PRIMARY KEY,
    col49 TEXT,
    col50 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 26: 열 51-52
CREATE TABLE excel_part26 (
    master_id INT NOT NULL PRIMARY KEY,
    col51 TEXT,
    col52 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 27: 열 53-54
CREATE TABLE excel_part27 (
    master_id INT NOT NULL PRIMARY KEY,
    col53 TEXT,
    col54 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 28: 열 55-56
CREATE TABLE excel_part28 (
    master_id INT NOT NULL PRIMARY KEY,
    col55 TEXT,
    col56 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 29: 열 57-58
CREATE TABLE excel_part29 (
    master_id INT NOT NULL PRIMARY KEY,
    col57 TEXT,
    col58 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테이블 30: 열 59-60
CREATE TABLE excel_part30 (
    master_id INT NOT NULL PRIMARY KEY,
    col59 TEXT,
    col60 TEXT,
    FOREIGN KEY (master_id) REFERENCES excel_master(id)
);

-- 테스트 사용자 권한 설정
GRANT ALL PRIVILEGES ON excel_test.* TO 'testuser'@'%';
FLUSH PRIVILEGES;

-- 엑셀 데이터를 30개 테이블에 분산 저장하는 프로시저
DROP PROCEDURE IF EXISTS sp_distribute_excel_data;

DELIMITER //

CREATE PROCEDURE sp_distribute_excel_data(
    IN p_json_data JSON
)
BEGIN
    DECLARE v_rows INT DEFAULT 0;
    DECLARE total_affected INT DEFAULT 0;
    DECLARE v_i INT DEFAULT 0;
    DECLARE v_master_id INT;
    DECLARE v_row_count INT;
    
    -- JSON 데이터 행 수 확인
    SET v_row_count = JSON_LENGTH(p_json_data);
    
    -- 트랜잭션 시작
    START TRANSACTION;
    
    -- 각 행마다 처리
    WHILE v_i < v_row_count DO
        -- 마스터 테이블에 새 행 삽입
        INSERT INTO excel_master () VALUES ();
        SET v_master_id = LAST_INSERT_ID();
        
        -- 각 분산 테이블에 데이터 삽입
        -- 테이블 1: 열 1-2
        INSERT INTO excel_part1 (master_id, col1, col2)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col1'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col2')))
        );
        
        -- 테이블 2: 열 3-4
        INSERT INTO excel_part2 (master_id, col3, col4)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col3'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col4')))
        );
        
        -- 테이블 3: 열 5-6
        INSERT INTO excel_part3 (master_id, col5, col6)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col5'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col6')))
        );
        
        -- 테이블 4: 열 7-8
        INSERT INTO excel_part4 (master_id, col7, col8)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col7'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col8')))
        );
        
        -- 테이블 5: 열 9-10
        INSERT INTO excel_part5 (master_id, col9, col10)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col9'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col10')))
        );
        
        -- 테이블 6: 열 11-12
        INSERT INTO excel_part6 (master_id, col11, col12)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col11'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col12')))
        );
        
        -- 테이블 7: 열 13-14
        INSERT INTO excel_part7 (master_id, col13, col14)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col13'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col14')))
        );
        
        -- 테이블 8: 열 15-16
        INSERT INTO excel_part8 (master_id, col15, col16)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col15'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col16')))
        );
        
        -- 테이블 9: 열 17-18
        INSERT INTO excel_part9 (master_id, col17, col18)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col17'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col18')))
        );
        
        -- 테이블 10: 열 19-20
        INSERT INTO excel_part10 (master_id, col19, col20)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col19'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col20')))
        );
        
        -- 테이블 11: 열 21-22
        INSERT INTO excel_part11 (master_id, col21, col22)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col21'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col22')))
        );
        
        -- 테이블 12: 열 23-24
        INSERT INTO excel_part12 (master_id, col23, col24)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col23'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col24')))
        );
        
        -- 테이블 13: 열 25-26
        INSERT INTO excel_part13 (master_id, col25, col26)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col25'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col26')))
        );
        
        -- 테이블 14: 열 27-28
        INSERT INTO excel_part14 (master_id, col27, col28)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col27'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col28')))
        );
        
        -- 테이블 15: 열 29-30
        INSERT INTO excel_part15 (master_id, col29, col30)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col29'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col30')))
        );
        
        -- 테이블 16: 열 31-32
        INSERT INTO excel_part16 (master_id, col31, col32)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col31'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col32')))
        );
        
        -- 테이블 17: 열 33-34
        INSERT INTO excel_part17 (master_id, col33, col34)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col33'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col34')))
        );
        
        -- 테이블 18: 열 35-36
        INSERT INTO excel_part18 (master_id, col35, col36)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col35'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col36')))
        );
        
        -- 테이블 19: 열 37-38
        INSERT INTO excel_part19 (master_id, col37, col38)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col37'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col38')))
        );
        
        -- 테이블 20: 열 39-40
        INSERT INTO excel_part20 (master_id, col39, col40)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col39'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col40')))
        );
        
        -- 테이블 21: 열 41-42
        INSERT INTO excel_part21 (master_id, col41, col42)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col41'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col42')))
        );
        
        -- 테이블 22: 열 43-44
        INSERT INTO excel_part22 (master_id, col43, col44)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col43'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col44')))
        );
        
        -- 테이블 23: 열 45-46
        INSERT INTO excel_part23 (master_id, col45, col46)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col45'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col46')))
        );
        
        -- 테이블 24: 열 47-48
        INSERT INTO excel_part24 (master_id, col47, col48)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col47'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col48')))
        );
        
        -- 테이블 25: 열 49-50
        INSERT INTO excel_part25 (master_id, col49, col50)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col49'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col50')))
        );
        
        -- 테이블 26: 열 51-52
        INSERT INTO excel_part26 (master_id, col51, col52)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col51'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col52')))
        );
        
        -- 테이블 27: 열 53-54
        INSERT INTO excel_part27 (master_id, col53, col54)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col53'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col54')))
        );
        
        -- 테이블 28: 열 55-56
        INSERT INTO excel_part28 (master_id, col55, col56)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col55'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col56')))
        );
        
        -- 테이블 29: 열 57-58
        INSERT INTO excel_part29 (master_id, col57, col58)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col57'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col58')))
        );
        
        -- 테이블 30: 열 59-60
        INSERT INTO excel_part30 (master_id, col59, col60)
        VALUES (
            v_master_id,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col59'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', v_i, '].col60')))
        );
        
        -- 행 카운트 증가
        SET total_affected = total_affected + 1;
        SET v_i = v_i + 1;
    END WHILE;
    
    -- 트랜잭션 커밋
    COMMIT;
    
    -- 처리된 행 수 반환
    SELECT total_affected AS total_rows_affected, v_row_count AS input_row_count;
    
END //

DELIMITER ;

-- 엑셀 데이터를 병합하여 모든 데이터를 조회하는 프로시저 (페이징 없음)
DROP PROCEDURE IF EXISTS sp_merge_excel_data_all;

DELIMITER //

CREATE PROCEDURE sp_merge_excel_data_all()
BEGIN
    SELECT 
        t1.master_id AS row_identifier,
        t1.col1, t1.col2,
        t2.col3, t2.col4,
        t3.col5, t3.col6,
        t4.col7, t4.col8,
        t5.col9, t5.col10,
        t6.col11, t6.col12,
        t7.col13, t7.col14,
        t8.col15, t8.col16,
        t9.col17, t9.col18,
        t10.col19, t10.col20,
        t11.col21, t11.col22,
        t12.col23, t12.col24,
        t13.col25, t13.col26,
        t14.col27, t14.col28,
        t15.col29, t15.col30,
        t16.col31, t16.col32,
        t17.col33, t17.col34,
        t18.col35, t18.col36,
        t19.col37, t19.col38,
        t20.col39, t20.col40,
        t21.col41, t21.col42,
        t22.col43, t22.col44,
        t23.col45, t23.col46,
        t24.col47, t24.col48,
        t25.col49, t25.col50,
        t26.col51, t26.col52,
        t27.col53, t27.col54,
        t28.col55, t28.col56,
        t29.col57, t29.col58,
        t30.col59, t30.col60
    FROM excel_part1 t1
    JOIN excel_part2 t2 ON t1.master_id = t2.master_id
    JOIN excel_part3 t3 ON t1.master_id = t3.master_id
    JOIN excel_part4 t4 ON t1.master_id = t4.master_id
    JOIN excel_part5 t5 ON t1.master_id = t5.master_id
    JOIN excel_part6 t6 ON t1.master_id = t6.master_id
    JOIN excel_part7 t7 ON t1.master_id = t7.master_id
    JOIN excel_part8 t8 ON t1.master_id = t8.master_id
    JOIN excel_part9 t9 ON t1.master_id = t9.master_id
    JOIN excel_part10 t10 ON t1.master_id = t10.master_id
    JOIN excel_part11 t11 ON t1.master_id = t11.master_id
    JOIN excel_part12 t12 ON t1.master_id = t12.master_id
    JOIN excel_part13 t13 ON t1.master_id = t13.master_id
    JOIN excel_part14 t14 ON t1.master_id = t14.master_id
    JOIN excel_part15 t15 ON t1.master_id = t15.master_id
    JOIN excel_part16 t16 ON t1.master_id = t16.master_id
    JOIN excel_part17 t17 ON t1.master_id = t17.master_id
    JOIN excel_part18 t18 ON t1.master_id = t18.master_id
    JOIN excel_part19 t19 ON t1.master_id = t19.master_id
    JOIN excel_part20 t20 ON t1.master_id = t20.master_id
    JOIN excel_part21 t21 ON t1.master_id = t21.master_id
    JOIN excel_part22 t22 ON t1.master_id = t22.master_id
    JOIN excel_part23 t23 ON t1.master_id = t23.master_id
    JOIN excel_part24 t24 ON t1.master_id = t24.master_id
    JOIN excel_part25 t25 ON t1.master_id = t25.master_id
    JOIN excel_part26 t26 ON t1.master_id = t26.master_id
    JOIN excel_part27 t27 ON t1.master_id = t27.master_id
    JOIN excel_part28 t28 ON t1.master_id = t28.master_id
    JOIN excel_part29 t29 ON t1.master_id = t29.master_id
    JOIN excel_part30 t30 ON t1.master_id = t30.master_id
    ORDER BY t1.master_id;
END //

DELIMITER ;
