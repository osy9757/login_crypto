/**
 * 선택된 행 데이터를 기반으로 엑셀 파일을 생성하고 다운로드합니다.
 * @param {Array<string>} headers - 엑셀 헤더 행 배열 (예: ['ID', '이름', '나이'])
 * @param {Array<Array<any>>} originalData - 전체 원본 데이터 배열 (2차원 배열)
 * @param {Set<number>} selectedIndices - 선택된 행의 원본 인덱스(0부터 시작)를 담고 있는 Set 객체
 * @param {string} [fileNamePrefix='selected_data'] - 다운로드될 파일 이름의 접두사
 */
const downloadSelectedExcelRows = (headers, originalData, selectedIndices, fileNamePrefix = 'selected_data') => {
    // SheetJS (XLSX) 라이브러리가 로드되었는지 확인 (간단한 체크)
    if (typeof XLSX === 'undefined') {
        console.error('SheetJS (XLSX) 라이브러리가 로드되지 않았습니다.');
        alert('파일 다운로드 라이브러리를 로드할 수 없습니다. 페이지를 새로고침 해주세요.');
        return;
    }

    if (!selectedIndices || selectedIndices.size === 0) {
        alert('다운로드할 행을 선택해주세요.');
        return;
    }

    const selectedRowsData = [headers]; // 헤더 포함

    // Set을 배열로 변환하고 정렬 (선택 사항, 순서를 유지하고 싶다면)
    const sortedIndices = Array.from(selectedIndices).sort((a, b) => a - b);

    sortedIndices.forEach(index => {
        if (originalData[index]) { // 해당 인덱스의 데이터가 원본 데이터에 있는지 확인
            selectedRowsData.push(originalData[index]);
        } else {
            console.warn(`선택된 인덱스 ${index}에 해당하는 원본 데이터가 없습니다.`);
        }
    });

    if (selectedRowsData.length <= 1) { // 헤더만 있는 경우
        alert('선택된 유효한 데이터가 없습니다.');
        return;
    }

    try {
        // 새로운 워크북 및 워크시트 생성
        const newWorkbook = XLSX.utils.book_new();
        const newWorksheet = XLSX.utils.aoa_to_sheet(selectedRowsData);

        // 워크북에 워크시트 추가
        XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Selected Data');

        // 엑셀 파일 생성 및 다운로드
        const fileName = `${fileNamePrefix}_${Date.now()}.xlsx`;
        XLSX.writeFile(newWorkbook, fileName);

    } catch (error) {
        console.error('엑셀 파일 생성 또는 다운로드 중 오류 발생:', error);
        alert('엑셀 파일을 생성하거나 다운로드하는 중 오류가 발생했습니다.');
    }
};

// 필요한 경우 이 파일을 모듈로 만들 수 있지만, 현재 구조에서는 전역 함수로 사용합니다.
// export { downloadSelectedExcelRows }; // 모듈로 사용 시 