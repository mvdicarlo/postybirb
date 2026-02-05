import { SelectOption } from '@postybirb/form-builder';

// Run this script on https://www.furaffinity.net/submit/finalize/ to update categories
// Array.prototype.map.call(document.querySelector("select[name='cat']"), (e) => ({value: e.value, label: e.label, parent: e.parentNode?.label})).reduce((e, c) => {  if (!c.parent) return e;  const f = e.find(e => e.label === c.parent) ?? (e[e.push({label: c.parent, items: []})-1]);  f.items.push({value: c.value, label: c.label});  return e;}, [])

export const FurAffinityCategories: SelectOption[] = [
  {
    label: 'Visual Art',
    items: [
      { value: '1', label: 'All' },
      { value: '34', label: '3D Models' },
      { value: '2', label: 'Artwork (Digital)' },
      { value: '3', label: 'Artwork (Traditional)' },
      { value: '4', label: 'Cel Shading' },
      { value: '5', label: 'Crafting' },
      { value: '6', label: 'Designs' },
      { value: '32', label: 'Food / Recipes' },
      { value: '8', label: 'Fursuiting' },
      { value: '9', label: 'Icons' },
      { value: '10', label: 'Mosaics' },
      { value: '11', label: 'Photography' },
      { value: '36', label: 'Pixel Art' },
      { value: '12', label: 'Sculpting' },
      { value: '35', label: 'Virtual Photography' },
    ],
  },
  {
    label: 'Animation & Media',
    items: [
      { value: '37', label: '2D Animation' },
      { value: '38', label: '3D Animation' },
      { value: '39', label: 'Pixel Animation' },
      { value: '7', label: 'Flash' },
      { value: '40', label: 'Interactive Media' },
    ],
  },
  {
    label: 'Readable Art',
    items: [
      { value: '13', label: 'Story' },
      { value: '14', label: 'Poetry' },
      { value: '15', label: 'Prose' },
    ],
  },
  {
    label: 'Audio Art',
    items: [
      { value: '16', label: 'Music' },
      { value: '17', label: 'Podcasts' },
    ],
  },
  {
    label: 'Downloadable',
    items: [
      { value: '18', label: 'Skins' },
      { value: '19', label: 'Handhelds' },
      { value: '20', label: 'Resources' },
    ],
  },
  {
    label: 'Other Stuff',
    items: [
      { value: '21', label: 'Adoptables' },
      { value: '22', label: 'Auctions' },
      { value: '23', label: 'Contests' },
      { value: '24', label: 'Current Events' },
      { value: '26', label: 'Stockart' },
      { value: '27', label: 'Screenshots' },
      { value: '28', label: 'Scraps' },
      { value: '29', label: 'Wallpaper' },
      { value: '30', label: 'YCH / Sale' },
      { value: '31', label: 'Other' },
    ],
  },
];
