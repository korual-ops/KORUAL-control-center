export function createUtmUrl(base,{source,medium,campaign,content}){
  const url=new URL(base);
  const values={utm_source:source,utm_medium:medium,utm_campaign:campaign,utm_content:content};
  for(const [key,value] of Object.entries(values))if(value)url.searchParams.set(key,String(value).trim().toLowerCase().replace(/\s+/g,'-'));
  return url.toString();
}
