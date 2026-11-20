const publicOrigin = 'https://seemly-finch-18b.notion.site/';

const pages = {
  modaktour: '41d8570d99c5817b8e68c572735bd59b',
  payment: '41d8570d99c5816bae7acc36da796171',
  backup: '41d8570d99c581318926d24b0c8686d8',
  memory: '41d8570d99c581569902f9f60574a3ae',
  database: '41d8570d99c581e4a789f026074041ad',
  permissions: '41d8570d99c581338763cc28eece9acb',
  buddy: '41d8570d99c581da85f6f54eef0cb0d7',
  market: '41d8570d99c58161a6e3e6d859726949',
  energy: '41d8570d99c5816288d6c869f864a933',
  company: '41d8570d99c581c8b79bfca7674bfb75',
  alerts: '41d8570d99c58141ba43dcb3578542f5',
  delivery: '41d8570d99c58183b2fac0bc60e8805a',
  practice: '41d8570d99c581558999cb513f0a91d7',
};

pages.erp = pages.permissions;
pages.upload = pages.memory;
pages.reboot = pages.alerts;

export function notionUrl(key) {
  if (!pages[key]) throw new Error(`Unknown Notion page: ${key}`);
  return new URL(pages[key], publicOrigin).href;
}
