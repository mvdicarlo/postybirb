export interface WebsiteConfig {

}

export function Website(websiteConfig: WebsiteConfig) {
  return (target: any) => {
    console.log('Invoking', target);
  }
}
