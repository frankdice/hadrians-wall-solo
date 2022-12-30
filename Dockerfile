FROM tiangolo/uwsgi-nginx-flask:python3.11-2022-12-26

COPY ./requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /app/requirements.txt

COPY ./ /app