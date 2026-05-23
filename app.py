import streamlit as st
import os

st.set_page_config(layout="wide")

html_file = open("public/index.html", "r", encoding="utf-8")
source_code = html_file.read()

st.markdown(source_code, unsafe_allow_html=True)