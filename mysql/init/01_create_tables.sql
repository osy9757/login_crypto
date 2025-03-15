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

-- 2개 열씩 저장할 30개의 분할 테이블
-- 테이블 1: 열 1-2
CREATE TABLE excel_part1 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col1 TEXT,
    col2 TEXT
);

-- 테이블 2: 열 3-4
CREATE TABLE excel_part2 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col3 TEXT,
    col4 TEXT
);

-- 테이블 3: 열 5-6
CREATE TABLE excel_part3 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col5 TEXT,
    col6 TEXT
);

-- 테이블 4: 열 7-8
CREATE TABLE excel_part4 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col7 TEXT,
    col8 TEXT
);

-- 테이블 5: 열 9-10
CREATE TABLE excel_part5 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col9 TEXT,
    col10 TEXT
);

-- 테이블 6: 열 11-12
CREATE TABLE excel_part6 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col11 TEXT,
    col12 TEXT
);

-- 테이블 7: 열 13-14
CREATE TABLE excel_part7 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col13 TEXT,
    col14 TEXT
);

-- 테이블 8: 열 15-16
CREATE TABLE excel_part8 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col15 TEXT,
    col16 TEXT
);

-- 테이블 9: 열 17-18
CREATE TABLE excel_part9 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col17 TEXT,
    col18 TEXT
);

-- 테이블 10: 열 19-20
CREATE TABLE excel_part10 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col19 TEXT,
    col20 TEXT
);

-- 테이블 11: 열 21-22
CREATE TABLE excel_part11 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col21 TEXT,
    col22 TEXT
);

-- 테이블 12: 열 23-24
CREATE TABLE excel_part12 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col23 TEXT,
    col24 TEXT
);

-- 테이블 13: 열 25-26
CREATE TABLE excel_part13 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col25 TEXT,
    col26 TEXT
);

-- 테이블 14: 열 27-28
CREATE TABLE excel_part14 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col27 TEXT,
    col28 TEXT
);

-- 테이블 15: 열 29-30
CREATE TABLE excel_part15 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col29 TEXT,
    col30 TEXT
);

-- 테이블 16: 열 31-32
CREATE TABLE excel_part16 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col31 TEXT,
    col32 TEXT
);

-- 테이블 17: 열 33-34
CREATE TABLE excel_part17 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col33 TEXT,
    col34 TEXT
);

-- 테이블 18: 열 35-36
CREATE TABLE excel_part18 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col35 TEXT,
    col36 TEXT
);

-- 테이블 19: 열 37-38
CREATE TABLE excel_part19 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col37 TEXT,
    col38 TEXT
);

-- 테이블 20: 열 39-40
CREATE TABLE excel_part20 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col39 TEXT,
    col40 TEXT
);

-- 테이블 21: 열 41-42
CREATE TABLE excel_part21 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col41 TEXT,
    col42 TEXT
);

-- 테이블 22: 열 43-44
CREATE TABLE excel_part22 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col43 TEXT,
    col44 TEXT
);

-- 테이블 23: 열 45-46
CREATE TABLE excel_part23 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col45 TEXT,
    col46 TEXT
);

-- 테이블 24: 열 47-48
CREATE TABLE excel_part24 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col47 TEXT,
    col48 TEXT
);

-- 테이블 25: 열 49-50
CREATE TABLE excel_part25 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col49 TEXT,
    col50 TEXT
);

-- 테이블 26: 열 51-52
CREATE TABLE excel_part26 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col51 TEXT,
    col52 TEXT
);

-- 테이블 27: 열 53-54
CREATE TABLE excel_part27 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col53 TEXT,
    col54 TEXT
);

-- 테이블 28: 열 55-56
CREATE TABLE excel_part28 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col55 TEXT,
    col56 TEXT
);

-- 테이블 29: 열 57-58
CREATE TABLE excel_part29 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col57 TEXT,
    col58 TEXT
);

-- 테이블 30: 열 59-60
CREATE TABLE excel_part30 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    col59 TEXT,
    col60 TEXT
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
    
    -- 임시 테이블 생성
    DROP TEMPORARY TABLE IF EXISTS temp_excel_data;
    CREATE TEMPORARY TABLE temp_excel_data (
        row_idx INT,
        col1 TEXT, col2 TEXT, col3 TEXT, col4 TEXT, col5 TEXT, 
        col6 TEXT, col7 TEXT, col8 TEXT, col9 TEXT, col10 TEXT,
        col11 TEXT, col12 TEXT, col13 TEXT, col14 TEXT, col15 TEXT,
        col16 TEXT, col17 TEXT, col18 TEXT, col19 TEXT, col20 TEXT,
        col21 TEXT, col22 TEXT, col23 TEXT, col24 TEXT, col25 TEXT,
        col26 TEXT, col27 TEXT, col28 TEXT, col29 TEXT, col30 TEXT,
        col31 TEXT, col32 TEXT, col33 TEXT, col34 TEXT, col35 TEXT,
        col36 TEXT, col37 TEXT, col38 TEXT, col39 TEXT, col40 TEXT,
        col41 TEXT, col42 TEXT, col43 TEXT, col44 TEXT, col45 TEXT,
        col46 TEXT, col47 TEXT, col48 TEXT, col49 TEXT, col50 TEXT,
        col51 TEXT, col52 TEXT, col53 TEXT, col54 TEXT, col55 TEXT,
        col56 TEXT, col57 TEXT, col58 TEXT, col59 TEXT, col60 TEXT,
        PRIMARY KEY (row_idx)
    );
    
    -- JSON 데이터를 행 단위로 임시 테이블에 삽입
    SET @row_count = JSON_LENGTH(p_json_data);
    SET @i = 0;
    
    WHILE @i < @row_count DO
        INSERT INTO temp_excel_data (
            row_idx,
            col1, col2, col3, col4, col5, col6, col7, col8, col9, col10,
            col11, col12, col13, col14, col15, col16, col17, col18, col19, col20,
            col21, col22, col23, col24, col25, col26, col27, col28, col29, col30,
            col31, col32, col33, col34, col35, col36, col37, col38, col39, col40,
            col41, col42, col43, col44, col45, col46, col47, col48, col49, col50,
            col51, col52, col53, col54, col55, col56, col57, col58, col59, col60
        )
        SELECT 
            @i,
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col1'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col2'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col3'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col4'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col5'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col6'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col7'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col8'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col9'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col10'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col11'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col12'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col13'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col14'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col15'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col16'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col17'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col18'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col19'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col20'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col21'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col22'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col23'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col24'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col25'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col26'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col27'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col28'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col29'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col30'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col31'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col32'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col33'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col34'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col35'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col36'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col37'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col38'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col39'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col40'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col41'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col42'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col43'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col44'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col45'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col46'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col47'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col48'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col49'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col50'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col51'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col52'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col53'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col54'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col55'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col56'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col57'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col58'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col59'))),
            JSON_UNQUOTE(JSON_EXTRACT(p_json_data, CONCAT('$[', @i, '].col60')))
        FROM DUAL;
        
        SET @i = @i + 1;
    END WHILE;
    
    -- 트랜잭션 시작
    START TRANSACTION;
    
    -- 각 테이블에 데이터 분산 저장
    -- 테이블 1: 열 1-2
    INSERT INTO excel_part1 (col1, col2)
    SELECT col1, col2 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 2: 열 3-4
    INSERT INTO excel_part2 (col3, col4)
    SELECT col3, col4 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 3: 열 5-6
    INSERT INTO excel_part3 (col5, col6)
    SELECT col5, col6 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 4: 열 7-8
    INSERT INTO excel_part4 (col7, col8)
    SELECT col7, col8 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 5: 열 9-10
    INSERT INTO excel_part5 (col9, col10)
    SELECT col9, col10 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 6: 열 11-12
    INSERT INTO excel_part6 (col11, col12)
    SELECT col11, col12 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 7: 열 13-14
    INSERT INTO excel_part7 (col13, col14)
    SELECT col13, col14 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 8: 열 15-16
    INSERT INTO excel_part8 (col15, col16)
    SELECT col15, col16 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 9: 열 17-18
    INSERT INTO excel_part9 (col17, col18)
    SELECT col17, col18 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 10: 열 19-20
    INSERT INTO excel_part10 (col19, col20)
    SELECT col19, col20 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 11: 열 21-22
    INSERT INTO excel_part11 (col21, col22)
    SELECT col21, col22 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 12: 열 23-24
    INSERT INTO excel_part12 (col23, col24)
    SELECT col23, col24 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 13: 열 25-26
    INSERT INTO excel_part13 (col25, col26)
    SELECT col25, col26 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 14: 열 27-28
    INSERT INTO excel_part14 (col27, col28)
    SELECT col27, col28 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 15: 열 29-30
    INSERT INTO excel_part15 (col29, col30)
    SELECT col29, col30 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 16: 열 31-32
    INSERT INTO excel_part16 (col31, col32)
    SELECT col31, col32 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 17: 열 33-34
    INSERT INTO excel_part17 (col33, col34)
    SELECT col33, col34 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 18: 열 35-36
    INSERT INTO excel_part18 (col35, col36)
    SELECT col35, col36 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 19: 열 37-38
    INSERT INTO excel_part19 (col37, col38)
    SELECT col37, col38 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 20: 열 39-40
    INSERT INTO excel_part20 (col39, col40)
    SELECT col39, col40 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 21: 열 41-42
    INSERT INTO excel_part21 (col41, col42)
    SELECT col41, col42 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 22: 열 43-44
    INSERT INTO excel_part22 (col43, col44)
    SELECT col43, col44 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 23: 열 45-46
    INSERT INTO excel_part23 (col45, col46)
    SELECT col45, col46 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 24: 열 47-48
    INSERT INTO excel_part24 (col47, col48)
    SELECT col47, col48 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 25: 열 49-50
    INSERT INTO excel_part25 (col49, col50)
    SELECT col49, col50 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 26: 열 51-52
    INSERT INTO excel_part26 (col51, col52)
    SELECT col51, col52 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 27: 열 53-54
    INSERT INTO excel_part27 (col53, col54)
    SELECT col53, col54 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 28: 열 55-56
    INSERT INTO excel_part28 (col55, col56)
    SELECT col55, col56 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 29: 열 57-58
    INSERT INTO excel_part29 (col57, col58)
    SELECT col57, col58 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 테이블 30: 열 59-60
    INSERT INTO excel_part30 (col59, col60)
    SELECT col59, col60 FROM temp_excel_data;
    SET total_affected = total_affected + ROW_COUNT();
    
    -- 트랜잭션 커밋
    COMMIT;
    
    -- 마지막에 누적된 총 행 수 반환
    SELECT total_affected AS total_rows_affected, @row_count AS input_row_count;
    
END //

DELIMITER ;

-- 엑셀 데이터를 병합하여 모든 데이터를 조회하는 프로시저 (페이징 없음)
DROP PROCEDURE IF EXISTS sp_merge_excel_data_all;

DELIMITER //

CREATE PROCEDURE sp_merge_excel_data_all()
BEGIN
    SELECT 
        t1.id AS row_identifier,
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
    JOIN excel_part2 t2 ON t1.id = t2.id
    JOIN excel_part3 t3 ON t1.id = t3.id
    JOIN excel_part4 t4 ON t1.id = t4.id
    JOIN excel_part5 t5 ON t1.id = t5.id
    JOIN excel_part6 t6 ON t1.id = t6.id
    JOIN excel_part7 t7 ON t1.id = t7.id
    JOIN excel_part8 t8 ON t1.id = t8.id
    JOIN excel_part9 t9 ON t1.id = t9.id
    JOIN excel_part10 t10 ON t1.id = t10.id
    JOIN excel_part11 t11 ON t1.id = t11.id
    JOIN excel_part12 t12 ON t1.id = t12.id
    JOIN excel_part13 t13 ON t1.id = t13.id
    JOIN excel_part14 t14 ON t1.id = t14.id
    JOIN excel_part15 t15 ON t1.id = t15.id
    JOIN excel_part16 t16 ON t1.id = t16.id
    JOIN excel_part17 t17 ON t1.id = t17.id
    JOIN excel_part18 t18 ON t1.id = t18.id
    JOIN excel_part19 t19 ON t1.id = t19.id
    JOIN excel_part20 t20 ON t1.id = t20.id
    JOIN excel_part21 t21 ON t1.id = t21.id
    JOIN excel_part22 t22 ON t1.id = t22.id
    JOIN excel_part23 t23 ON t1.id = t23.id
    JOIN excel_part24 t24 ON t1.id = t24.id
    JOIN excel_part25 t25 ON t1.id = t25.id
    JOIN excel_part26 t26 ON t1.id = t26.id
    JOIN excel_part27 t27 ON t1.id = t27.id
    JOIN excel_part28 t28 ON t1.id = t28.id
    JOIN excel_part29 t29 ON t1.id = t29.id
    JOIN excel_part30 t30 ON t1.id = t30.id
    ORDER BY t1.id;
END //

DELIMITER ;
