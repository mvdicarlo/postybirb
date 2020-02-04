import { Categories } from './categories';

export default class DeviantArtCategories {
  public static readonly categories = Categories;

  public static getCategoryByTitle(title: string) {
    return DeviantArtCategories.categories.find(c => c.title === title);
  }

  public static getCategoryByPath(path: string) {
    return DeviantArtCategories.categories.find(c => c.path === path);
  }
}
