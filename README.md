To create a PDF from an uploaded file:

  POST /pdfify
  
  <file content>

To create a PDF from an arbitrary web page by URL:

  GET /pdfify?url=<url>&waitForDomSelector=body

You can replace 'body' with some other selector
in case you need to wait for some javascript to run before PDFifying.

In either case, the resulting PDF file will be returned.
