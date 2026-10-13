import { test, expect, goView } from './harness.mjs';

const fill = async (page, { name = '', type, content = '' }) => {
  await page.fill('#rn', name);
  if (type) await page.selectOption('#rt', type);
  await page.fill('#rc', content);
};

test.describe('수정 요청', () => {
  test('보내기: Apps Script 로 {name,type,content} JSON 이 한 번 간다', async ({ launch }) => {
    const { page, mock } = await launch();
    await goView(page, 'request');
    await fill(page, { name: '  김보성 ', type: '프로그램 개선', content: '  달력에 학년 필터가 있으면 좋겠습니다.\n두 줄째  ' });
    await page.locator('#rf button[type="submit"]').click();

    await expect.poll(() => mock.posts.length).toBe(1);
    const post = mock.posts[0];
    expect(post.method).toBe('POST');
    expect(new URL(post.url).hostname).toBe('script.google.com');
    expect(post.url).toMatch(/\/macros\/s\/[^/]+\/exec$/);
    expect(post.headers['content-type']).toMatch(/^text\/plain/);   // CORS 사전 요청이 없는 단순 요청
    expect(post.json).toEqual({
      name: '김보성',                                      // 앞뒤 공백은 다듬는다
      type: '프로그램 개선',
      content: '달력에 학년 필터가 있으면 좋겠습니다.\n두 줄째',
    });
    expect(Object.keys(post.json).sort()).toEqual(['content', 'name', 'type']);

    const msg = page.locator('#rmsg');
    await expect(msg).toHaveText('보냈습니다. 반영은 담당자 확인 후.');
    await expect(msg).toHaveClass(/\bok\b/);
    await expect(page.locator('#rc')).toHaveValue('');          // 내용은 비우고
    await expect(page.locator('#rn')).toHaveValue('  김보성 ');  // 이름은 남긴다 (다음 요청에 쓰도록)
    await expect(page.locator('#rcount')).toHaveText('0자');
  });

  test('종류 기본값은 "일정수정"', async ({ launch }) => {
    const { page, mock } = await launch();
    await goView(page, 'request');
    await fill(page, { name: '박교사', content: '3/14 학교 설명회 일정 수정' });
    await page.locator('#rf button[type="submit"]').click();
    await expect.poll(() => mock.posts.length).toBe(1);
    expect(mock.posts[0].json.type).toBe('일정수정');
  });

  test('작성자가 비면 보내지 않고 안내한다', async ({ launch }) => {
    const { page, mock } = await launch();
    await goView(page, 'request');
    await fill(page, { name: '', content: '내용만 있음' });
    await page.locator('#rf button[type="submit"]').click();
    const msg = page.locator('#rmsg');
    await expect(msg).toHaveText('작성자와 내용을 채워 주세요');
    await expect(msg).toHaveClass(/\bno\b/);
    await expect(page.locator('#rc')).toHaveValue('내용만 있음');
    expect(mock.posts).toHaveLength(0);
  });

  test('내용이 비어도(공백만이어도) 보내지 않는다', async ({ launch }) => {
    const { page, mock } = await launch();
    await goView(page, 'request');
    await fill(page, { name: '김보성', content: '   \n  ' });
    await page.locator('#rf button[type="submit"]').click();
    await expect(page.locator('#rmsg')).toHaveText('작성자와 내용을 채워 주세요');
    expect(mock.posts).toHaveLength(0);
  });

  test('보내기가 실패하면 내용은 그대로 남는다', async ({ launch }) => {
    const { page, mock } = await launch({ mock: { postBehavior: 'abort' } });
    await goView(page, 'request');
    await fill(page, { name: '김보성', content: '다시 보낼 내용' });
    await page.locator('#rf button[type="submit"]').click();
    await expect(page.locator('#rmsg')).toHaveText('보내지 못했습니다. 내용은 그대로 있습니다.');
    await expect(page.locator('#rmsg')).toHaveClass(/\bno\b/);
    await expect(page.locator('#rc')).toHaveValue('다시 보낼 내용');
    await expect(page.locator('#rf button[type="submit"]')).toBeEnabled();
    expect(mock.posts).toHaveLength(1);
  });

  test('보내는 동안 폼은 잠기고 "보내는 중" 으로 바뀐다', async ({ launch }) => {
    const { page, mock } = await launch({ mock: { postBehavior: 'hang' } });
    await goView(page, 'request');
    await fill(page, { name: '김보성', content: '응답이 없는 경우' });
    await page.locator('#rf button[type="submit"]').click();
    const btn = page.locator('#rf button[type="submit"]');
    await expect(btn).toHaveText('보내는 중');
    await expect(btn).toBeDisabled();
    await expect(page.locator('#rc')).toBeDisabled();
    expect(mock.posts).toHaveLength(1);
  });

  test('쓰던 글은 화면을 바꿔도, 새로고침해도 남는다 (초안)', async ({ launch }) => {
    const { page } = await launch();
    await goView(page, 'request');
    await fill(page, { name: '김보성', type: '기타', content: '초안입니다' });
    await expect(page.locator('#rcount')).toHaveText('5자');
    await goView(page, 'plan');
    await goView(page, 'request');
    await expect(page.locator('#rc')).toHaveValue('초안입니다');
    await page.reload();
    await goView(page, 'request');
    await expect(page.locator('#rn')).toHaveValue('김보성');
    await expect(page.locator('#rt')).toHaveValue('기타');
    await expect(page.locator('#rc')).toHaveValue('초안입니다');
  });
});
