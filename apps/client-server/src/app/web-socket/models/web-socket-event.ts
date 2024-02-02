export abstract class WebsocketEvent<D> {
  event: string;

  data: D;

  constructor(data: D) {
    this.data = data;
  }
}
