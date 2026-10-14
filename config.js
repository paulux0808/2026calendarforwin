/* 학교가 고치는 곳은 이 파일 하나다. 새 학년도 시트가 생기면 YEARS 에 한 줄 더한다. */

/* 학년도(3월~다음 해 2월)마다 시트 하나. year 는 학년도, sheetId 는 주소 /d/ 뒤의 값,
   postUrl 은 그 시트에서 배포한 Apps Script 웹앱 주소(수정 요청이 간다).
   시트 탭 구성이 해마다 다르면 항목에 tabs 를 따로 줄 수 있다. */
export const YEARS = [
  { year:2026, sheetId:"1qg5vX4KlrI3hwn1XLiLIupkO74zxleqV6Imk1y5YQIE",
    postUrl:"https://script.google.com/macros/s/AKfycbwBjyHOzjirmpJe7InaHcwzsygoN1nNjqrYebPqfiWX_58Ezea-qUKquRIqnrv5Q_sF/exec" },
];

/* 시트 탭 — gid 는 주소 끝 #gid=. 시트를 사본으로 만들면 gid 는 그대로다. name 은 화면 표시용 */
export const TABS = [
  { key:"schedule",   gid:"0",          name:"연중행사계획" },
  { key:"student",    gid:"1112677469", name:"(학생용)연중행사계획" },
  { key:"supervisor", gid:"1459415616", name:"자습감독" },
  { key:"prayer",     gid:"1697887995", name:"기도순서" },
  { key:"notice",     gid:"1487091944", name:"공지사항" },
  { key:"nuga",       gid:"2041576858", name:"창체누가기록" }
];

export const TIMING = { POLL_MS:300000, LOAD_MS:12000, POST_MS:20000 };

/* 부서 — [이름, 색상, 채도]. 계열끼리 색상군으로 묶어 색만 봐도 성격이 잡히게. */
export const DEPTS = [
  ["교목부",292,40], ["교무부",220,44], ["연구부",232,42], ["상담부",320,38], ["정보부",244,40],
  ["1학년부",16,52], ["2학년부",30,54], ["3학년부",44,54], ["기획위원",254,38], ["행정실",210,26],
  ["국어과",108,40], ["영어과",124,38], ["수학과",160,42], ["사회과",138,36], ["과학과",172,42],
  ["예체능과",184,40], ["정보과",196,42], ["외국어과",66,46], ["기타",212,7]
];

/* 창체 영역 색 — 부서 칩과 같은 방식. 색상만 다르게 준다.
   마크 색은 명도대역·채도·색각이상 분리 검사를 통과한 값에서 뽑았다. */
export const CAT_TONE = {
  "자율":"--dh:218;--ds:62%", "자율자치":"--dh:218;--ds:62%",
  "봉사":"--dh:168;--ds:66%", "동아리":"--dh:33;--ds:72%", "진로":"--dh:283;--ds:48%"
};
