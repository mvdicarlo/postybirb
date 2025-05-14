async postFileSubmission(
    cancellationToken: CancellationToken,
    data: FilePostData<DeviantArtFileOptions>,
    accountData: DeviantArtAccountData,
  ): Promise<PostResponse> {
    const fileUpload = await Http.post<{
      deviationId: number;
      status: string;
      stashId: number;
      privateId: number;
      size: number;
      cursor: string;
      title: string;
    }>(`${this.BASE_URL}/_puppy/dashared/deviation/submit/upload/deviation`, {
      partition: data.part.accountId,
      type: 'multipart',
      data: {
        upload_file: data.primary.file,
        use_defaults: 'true',
        folder_name: 'Saved Submissions',
        da_minor_version: '20230710',
        csrf_token: await this.getCSRF(data.part.accountId),
      },
    });

    if (fileUpload.body.status !== 'success') {
      return Promise.reject(
        this.createPostResponse({
          additionalInfo: fileUpload.body,
          message: 'Failed to upload file.',
        }),
      );
    }

    this.checkCancelled(cancellationToken);
    const mature =
      data.options.isMature ||
      data.rating === SubmissionRating.ADULT ||
      data.rating === SubmissionRating.MATURE ||
      data.rating === SubmissionRating.EXTREME;

    const updateBody: any = {
      allow_comments: data.options.disableComments ? false : true,
      allow_free_download: data.options.freeDownload ? true : false,
      deviationid: fileUpload.body.deviationId,
      da_minor_version: 20230710,
      display_resolution: 0,
      editorRaw: this.htmlToEditorRawDescription(data.description),
      editor_v3: '',
      galleryids: data.options.folders,
      is_ai_generated: data.options.isAIGenerated ?? false,
      is_scrap: data.options.scraps,
      license_options: {
        creative_commons: data.options.isCreativeCommons ?? false,
        commercial: data.options.isCommercialUse ?? false,
        modify: data.options.allowModifications || 'no',
      },
      location_tag: null,
      noai: data.options.noAI ?? true,
      subject_tag_types: '_empty',
      subject_tags: '_empty',
      tags: this.formatTags(data.tags),
      tierids: '_empty',
      title: this.truncateTitle(data.title).title,
      csrf_token: await this.getCSRF(data.part.accountId),
    };

    if (data.options.freeDownload) {
      updateBody.pcp_price_points = 0;
    }

    if (mature) {
      updateBody.is_mature = true;
    }

    if (data.options.folders.length === 0) {
      const folders = this.getAccountInfo(data.part.accountId, GenericAccountProp.FOLDERS) || [];
      const featured = folders.find(f => f.label === 'Featured');
      if (featured) {
        updateBody.galleryids = [`${featured.value}`];
      }
    }

    const update = await Http.post<{
      status: string;
      url: string;
      deviationId: number;
    }>(`${this.BASE_URL}/_napi/shared_api/deviation/update`, data.part.accountId, {
      type: 'json',
      data: updateBody,
      requestOptions: { json: true },
    });

    this.checkCancelled(cancellationToken);
    if (update.body.status !== 'success') {
      return Promise.reject(
        this.createPostResponse({
          additionalInfo: update.body,
          message: 'Failed to update file post.',
        }),
      );
    }

    const publish = await Http.post<{
      status: string;
      url: string;
      deviationId: number;
    }>(`${this.BASE_URL}/_puppy/dashared/deviation/publish`, {
      partition: data.part.accountId,
      type: 'json',
      data: {
        stashid: update.body.deviationId,
        da_minor_version: 20230710,
        csrf_token: await this.getCSRF(data.part.accountId),
      },
    });

    if (publish.body.status !== 'success') {
      return Promise.reject(
        this.createPostResponse({
          additionalInfo: publish.body,
          message: 'Failed to publish post.',
        }),
      );
    }
    return this.createPostResponse({ source: publish.body.url });
  }