import pytesseract
from pdf2image import convert_from_path
from pypdf import PdfReader, PdfWriter
import os
from tqdm import tqdm


class PDF:
    def __init__(self, input_path):
        self.input_pdf = PdfReader(input_path)
        self.pdf_name = input_path.split('/')[-1].split('.')[0]
        self.split_path = None

    def split_pages(self, save_path=None):
        save_path = save_path or self.pdf_name + "_split"
        os.makedirs(save_path, exist_ok=True)
        for i, page in tqdm(enumerate(self.input_pdf.pages), total=len(self.input_pdf.pages),
                            desc=f"Splitting PDF-{self.pdf_name}"):
            writer = PdfWriter()
            writer.add_page(page)
            output_path = os.path.join(save_path, f"page_{i + 1}.pdf")
            with open(output_path, "wb") as f_out:
                writer.write(f_out)
        self.split_path = save_path

    def ocr_pages(self, page_start=None, page_end=None, save_path=None) -> str:
        # Check whether the named pages exist
        page_start = page_start or 0
        page_end = page_end or len(self.input_pdf.pages)
        if self.split_path is None:
            self.split_pages()
        text_data = ''
        for i in tqdm(range(page_start, page_end), total=page_end - page_start, desc=f"OCRing PDF-{self.pdf_name}"):
            page_path = os.path.join(self.split_path, f"page_{i + 1}.pdf")  # type: ignore
            page = convert_from_path(page_path, 600)
            # extract text
            text = pytesseract.image_to_string(page[0])
            text_data += text + '\n'
        if save_path is not None:
            with open(save_path, "w") as f_out:
                f_out.write(text_data)
        return text_data


