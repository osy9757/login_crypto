const fileInput = document.getElementById('excelFile');
const dataTableElement = $('#dataTable'); // jQuery 객체로 테이블 요소 참조
const downloadBtn = document.getElementById('downloadBtn');

let tableData = []; // Store the original parsed data (without checkboxes)
let headers = []; // Store the original headers
let dataTableInstance = null; // Store the DataTables instance
let selectedRowIndices = new Set(); // Store the original indices of selected rows (persists across pages)

// --- Helper Function to Destroy Existing DataTable --- //
const destroyDataTable = () => {
    if (dataTableInstance) {
        dataTableInstance.destroy();
        dataTableElement.find('thead').empty();
        dataTableElement.find('tbody').empty();
        dataTableInstance = null;
        selectedRowIndices.clear(); // Clear selections when table is destroyed
    }
};

// --- Helper Function to Update Select All Checkbox State --- //
const updateSelectAllCheckbox = () => {
    if (!dataTableInstance) return;

    const headerCheckbox = $('#selectAllCheckbox');
    if (!headerCheckbox.length) return; // 헤더 체크박스가 없으면 종료

    const currentPageRows = dataTableInstance.rows({ page: 'current' }).nodes();
    const currentPageCheckboxes = $(currentPageRows).find('.row-checkbox');

    if (currentPageCheckboxes.length === 0) {
        headerCheckbox.prop('checked', false);
        headerCheckbox.prop('indeterminate', false);
        return;
    }

    let allChecked = true;
    let noneChecked = true;

    currentPageCheckboxes.each(function() {
        const originalIndex = parseInt($(this).data('original-index'), 10);
        if (selectedRowIndices.has(originalIndex)) {
            noneChecked = false;
        } else {
            allChecked = false;
        }
    });

    headerCheckbox.prop('checked', allChecked);
    headerCheckbox.prop('indeterminate', !allChecked && !noneChecked);
};

// --- 1. 엑셀 파일 업로드 및 화면 출력 (DataTables.net 사용) --- //
const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            const rawTableData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (rawTableData.length < 2) {
                alert('엑셀 파일에 헤더 또는 데이터가 부족합니다.');
                destroyDataTable();
                return;
            }

            // 원본 헤더와 데이터 저장
            headers = rawTableData[0];
            tableData = rawTableData.slice(1);

            // DataTables에 필요한 형식으로 데이터 가공
            // 첫 번째 열: 체크박스 (렌더링 시 생성)
            // 나머지 열: 원본 데이터
            const processedData = tableData.map((rowData, index) => {
                // 첫 번째 요소는 체크박스 렌더링을 위한 인덱스 또는 식별자.
                // 실제 체크박스 HTML은 columns.render 에서 생성.
                return [index, ...rowData];
            });

            // 헤더 준비 ('선택' 열 포함) -> DataTables columns 설정으로 이동
            /*
            const processedHeaders = [
                { title: '<input type="checkbox" id="selectAllCheckbox"> ', orderable: false, className: 'select-all-header' },
                ...headers.map(header => ({ title: header }))
            ];
            */

            // 기존 DataTable 인스턴스 파괴
            destroyDataTable();

            // DataTables 초기화
            dataTableInstance = dataTableElement.DataTable({
                data: processedData,
                columns: [
                    {
                        // 첫 번째 열 (체크박스)
                        title: '<input type="checkbox" id="selectAllCheckbox"> ', // 헤더에 체크박스 추가
                        data: 0, // processedData의 첫 번째 요소 (index)
                        orderable: false,
                        className: 'dt-body-center select-checkbox', // 체크박스 스타일링용 클래스
                        render: function (data, type, row, meta) {
                            // data는 현재 processedData의 첫 번째 요소 (index)
                            const isChecked = selectedRowIndices.has(data);
                            return `<input type="checkbox" class="row-checkbox" data-original-index="${data}" ${isChecked ? 'checked' : ''}>`;
                        }
                    },
                    // 나머지 데이터 열 자동 생성
                    ...headers.map((header, index) => ({
                        title: header, // 각 데이터 열의 헤더 타이틀 설정
                        data: index + 1 // processedData의 두 번째 요소부터 매핑 (index + 1)
                    }))
                ],
                columnDefs: [
                     { // 첫번째 컬럼 체크박스 가운데 정렬 및 크기 조절 등
                        targets: 0,
                        width: '10px', // 필요에 따라 너비 조절
                     }
                ],
                searching: true,    // 검색 기능 활성화
                ordering: true,     // 정렬 기능 활성화
                pageLength: 10,     // 기본 페이지당 행 수
                lengthMenu: [[5, 10, 25, 50, 100, 300, 500, -1], [5, 10, 25, 50, 100, 300, 500, "All"]], // 페이지당 행 수 선택 옵션 (수정 후)
                language: {         // 한국어 설정
                    search: "검색:",
                    lengthMenu: "_MENU_ 개씩 보기",
                    info: "총 _TOTAL_개 중 _START_에서 _END_까지 표시",
                    infoEmpty: "표시할 데이터가 없습니다.",
                    infoFiltered: "(총 _MAX_개 데이터에서 필터링됨)",
                    zeroRecords: "일치하는 데이터가 없습니다.",
                    paginate: {
                        first: "처음",
                        last: "마지막",
                        next: "다음",
                        previous: "이전"
                    }
                },
                // select 옵션은 직접 관리하므로 제거하거나 주석 처리 가능
                // select: { // 선택 기능 관련 (여기서는 직접 체크박스로 처리)
                //     style: 'os',
                //     selector: 'td:first-child'
                // },
                order: [[1, 'asc']],
                // drawCallback: 테이블이 다시 그려질 때마다 실행 (페이지 이동, 검색, 정렬 등)
                drawCallback: function(settings) {
                    // 현재 페이지의 체크박스 상태를 selectedRowIndices 기준으로 업데이트
                    this.api().rows({ page: 'current' }).nodes().each(function(row, index) {
                        const checkbox = $(row).find('.row-checkbox');
                        const originalIndex = parseInt(checkbox.data('original-index'), 10);
                        checkbox.prop('checked', selectedRowIndices.has(originalIndex));
                    });
                    // 전체 선택 체크박스 상태 업데이트
                    updateSelectAllCheckbox();
                }
            });

            // --- 전체 선택 체크박스 기능 추가 --- //
            dataTableElement.off('change', '#selectAllCheckbox').on('change', '#selectAllCheckbox', function() {
                const isChecked = $(this).prop('checked');
                // 현재 페이지의 모든 행의 원본 인덱스를 가져옴
                const currentPageIndices = dataTableInstance.rows({ page: 'current' }).data().toArray().map(row => row[0]); // row[0] is the original index

                currentPageIndices.forEach(index => {
                    if (isChecked) {
                        selectedRowIndices.add(index);
                    } else {
                        selectedRowIndices.delete(index);
                    }
                });
                // 테이블을 다시 그려서 현재 페이지 체크박스 상태 업데이트 및 drawCallback 호출
                dataTableInstance.rows({ page: 'current' }).invalidate('data').draw(false);
            });

            // 개별 체크박스 변경 시 전체 선택 체크박스 상태 업데이트
            dataTableElement.off('change', '.row-checkbox').on('change', '.row-checkbox', function() {
                const originalIndex = parseInt($(this).data('original-index'), 10);
                if ($(this).prop('checked')) {
                    selectedRowIndices.add(originalIndex);
                } else {
                    selectedRowIndices.delete(originalIndex);
                }
                // 전체 선택 체크박스 상태 업데이트
                updateSelectAllCheckbox();
            });

        } catch (error) {
            console.error('파일 처리 오류:', error);
            alert('엑셀 파일을 처리하는 중 오류가 발생했습니다.');
            destroyDataTable();
        }
    };

    reader.onerror = (error) => {
        console.error('파일 읽기 오류:', error);
        alert('파일을 읽는 중 오류가 발생했습니다.');
    };

    reader.readAsArrayBuffer(file);
};

// --- 3. 선택된 행 다운로드 (외부 함수 호출) --- //
const handleDownload = () => {
    // downloadSelectedExcelRows 함수가 로드되었는지 확인
    if (typeof downloadSelectedExcelRows === 'function') {
        // 인자로 헤더, 원본 데이터 배열, 선택된 인덱스 Set 전달
        downloadSelectedExcelRows(headers, tableData, selectedRowIndices);
    } else {
        console.error('downloadSelectedExcelRows 함수를 찾을 수 없습니다. excel_download.js 파일이 올바르게 로드되었는지 확인하세요.');
        alert('다운로드 기능을 사용할 수 없습니다.');
    }
};

// --- 이벤트 리스너 등록 --- //
fileInput.addEventListener('change', handleFileUpload);
downloadBtn.addEventListener('click', handleDownload);

// --- 초기 상태 --- //
// 페이지 로드 시 DataTable 초기화 (데이터 없이) -> 제거
/*
$(document).ready(function() {
    // DataTable 초기화 (옵션만 설정, 데이터는 파일 업로드 시 로드)
    // 또는 빈 테이블 상태로 보여주기
     dataTableElement.DataTable({
        searching: true,
        ordering: true,
        pageLength: 10,
        lengthMenu: [[5, 10, 25, 50, -1], [5, 10, 25, 50, "All"]],
        language: { 
             search: "검색:",
             lengthMenu: "_MENU_ 개씩 보기",
             info: "총 _TOTAL_개 중 _START_에서 _END_까지 표시",
             infoEmpty: "표시할 데이터가 없습니다.",
             infoFiltered: "(총 _MAX_개 데이터에서 필터링됨)",
             zeroRecords: "엑셀 파일을 업로드해주세요.", // 초기 메시지 변경
             paginate: {
                 first: "처음",
                 last: "마지막",
                 next: "다음",
                 previous: "이전"
             }
        },
        // 초기에는 데이터가 없으므로 columns 정의 생략 가능 또는 빈 데이터 처리
     });
});
*/ 